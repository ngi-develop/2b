import { ApiError } from './error.js'

/**
 * Validates req[source] against a zod schema and replaces it with the parsed
 * value, so handlers receive coerced types (dates as Date, numbers as Number)
 * and never see a field the schema did not declare.
 */
export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source])
    if (!result.success) {
      const details = {}
      for (const issue of result.error.issues) {
        details[issue.path.join('.') || '_'] = issue.message
      }
      return next(new ApiError(422, 'Certains champs sont invalides.', details))
    }
    if (source === 'query') {
      // Express 5 exposes req.query as a getter — assign onto a own property.
      Object.defineProperty(req, 'query', { value: result.data, writable: true })
    } else {
      req[source] = result.data
    }
    next()
  }
}
