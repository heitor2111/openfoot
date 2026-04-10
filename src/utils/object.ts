/**
 * Receive an nested object and return a new object with all nested properties flattened into a single level, using dot notation for the keys.
 *
 * @param obj The object to flatten
 * @param parentKey The base key to use for the current level of recursion (used internally)
 * @returns A new object with all nested properties flattened
 */
export const flattenObject = <T extends Record<string, unknown>>(
  obj: T,
  parentKey = ''
): Record<string, unknown> => {
  const result: Record<string, unknown> = {}

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key]
      const newKey = parentKey ? `${parentKey}.${key}` : key

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(result, flattenObject(value as Record<string, unknown>, newKey))
      } else {
        result[newKey] = value
      }
    }
  }

  return result
}
