import camelcaseKeys from 'camelcase-keys'
import { z } from 'zod'

import { HttpRequestMethod } from '@/libs/actions/http-request'
import { MAVLinkType } from '@/libs/connection/m2r/messages/mavlink2rest-enum'
import { customActionTypes } from '@/libs/joystick/protocols/cockpit-actions'
import { CockpitModifierKeyOption, JoystickProtocol } from '@/types/joystick'

/**
 * Converts a string from camelCase, snake_case, or PascalCase to kebab-case
 * @param {string} str The string to convert
 * @returns {string} The string in kebab-case
 */
const toKebabCase = (str: string): string => {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase()
}

/**
 * Creates a preprocessing Zod schema that converts all keys to camelCase before validation
 * @param {z.ZodTypeAny} schema The Zod schema to convert
 * @returns {z.ZodTypeAny} The converted Zod schema
 */
const preprocessCamelCase = <T extends z.ZodTypeAny>(schema: T): z.ZodTypeAny =>
  z.preprocess((val: any) => {
    if (!val || typeof val !== 'object') return val

    // eslint-disable-next-line jsdoc/require-jsdoc
    function deepCloneJson<V>(v: V): V {
      return JSON.parse(JSON.stringify(v))
    }

    // deep-clone to avoid mutating original input (JSON clone is fine for config objects)
    const clone = deepCloneJson(val)

    // collect paths and values of all headers objects
    // eslint-disable-next-line jsdoc/require-jsdoc
    const headerEntries: Array<{ path: (string | number)[]; value: any }> = []

    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    const extract = (obj: any, path: (string | number)[]) => {
      if (!obj || typeof obj !== 'object') return
      if (Array.isArray(obj)) {
        obj.forEach((it, i) => extract(it, path.concat(i)))
        return
      }
      for (const [k, v] of Object.entries(obj)) {
        if (k === 'headers' && v && typeof v === 'object' && !Array.isArray(v)) {
          headerEntries.push({ path: path.concat(k), value: v })
          delete obj[k]
        } else {
          extract(v, path.concat(k))
        }
      }
    }

    extract(clone, [])

    // camelcase everything else deeply
    const camelized = camelcaseKeys(clone, { deep: true })

    // helper to set by path
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    const setByPath = (root: any, path: (string | number)[], value: any) => {
      let cur = root
      for (let i = 0; i < path.length - 1; i++) {
        const p = path[i]
        if (cur[p] === undefined) cur[p] = typeof path[i + 1] === 'number' ? [] : {}
        cur = cur[p]
      }
      cur[path[path.length - 1]] = value
    }

    // restore headers at same paths
    for (const { path, value } of headerEntries) {
      setByPath(camelized, path, value)
    }

    return camelized
  }, schema)

// Zod schemas for external API responses
const ServiceMetadataSchema = z
  .object({
    extras: z
      .object({
        cockpit: z.string().optional(),
      })
      .nullish(),
    worksInRelativePaths: z.boolean().optional(),
    sanitizedName: z.string().optional(),
  })
  .nullish()

export const ServiceSchema = preprocessCamelCase(
  z.object({
    metadata: ServiceMetadataSchema,
    port: z.number().optional(),
  })
)

const ExternalWidgetSetupInfoSchema = z.object({
  name: z.string(),
  iframeUrl: z.string(),
  iframeIcon: z.string(),
  collapsibleContainerName: z.string().optional(),
  version: z.string().optional(),
  startCollapsed: z.boolean().optional(),
  useVehicleAddressAsBaseUrl: z.boolean().optional(),
})

const HttpRequestActionConfigSchema = z.object({
  name: z.string(),
  url: z.string(),
  method: z.enum(HttpRequestMethod),
  headers: z.record(z.string(), z.string()),
  urlParams: z.record(z.string(), z.string()).default({}),
  body: z.string(),
})

const MavlinkMessageActionConfigSchema = z.object({
  name: z.string(),
  messageType: z.enum(MAVLinkType),
  messageConfig: z.any(),
})

const JavascriptActionConfigSchema = z.object({
  name: z.string(),
  code: z.string(),
})

const ActionConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(customActionTypes),
  config: z.union([HttpRequestActionConfigSchema, MavlinkMessageActionConfigSchema, JavascriptActionConfigSchema]),
  version: z.string().optional(),
})

const JoystickButtonMappingSuggestionSchema = z
  .object({
    id: z.string(),
    actionProtocol: z.string().transform((val) => toKebabCase(val) as JoystickProtocol),
    actionName: z.string(),
    actionId: z.string(),
    button: z.number(),
    modifierKey: z.enum(CockpitModifierKeyOption),
    description: z.string().optional(),
  })
  .transform((data) => ({
    ...data,
    modifier: data.modifierKey,
    modifierKey: undefined as never,
  }))

const JoystickMapSuggestionGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  buttonMappingSuggestions: z.array(JoystickButtonMappingSuggestionSchema),
  version: z.string().optional(),
})

export const ExtrasJsonSchema = preprocessCamelCase(
  z.object({
    targetCockpitApiVersion: z.string(),
    targetSystem: z.string(),
    widgets: z.array(ExternalWidgetSetupInfoSchema).default([]),
    actions: z.array(ActionConfigSchema).default([]),
    joystickSuggestions: z.array(JoystickMapSuggestionGroupSchema).optional(),
  })
)
