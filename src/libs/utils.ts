/* eslint-disable @typescript-eslint/no-explicit-any */

export const constrain = (value: number, min: number, max: number): number => {
  return Math.max(Math.min(value, max), min)
}

export const radians = (angle: number): number => (angle * Math.PI) / 180

export const degrees = (angle: number): number => (angle * 180) / Math.PI

export const isEqual = (obj1: any, obj2: any): boolean => {
  return JSON.stringify(obj1) === JSON.stringify(obj2)
}

export const round = (value: number, places = 2): number => {
  const power = Math.pow(10, places)
  return Math.round(value * power) / power
}
