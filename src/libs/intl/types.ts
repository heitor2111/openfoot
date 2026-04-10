import type { ptBRMessages } from '@/lang/pt_BR'

type DotPaths<T, Prefix extends string = ''> = {
  [K in keyof T & (string | number)]: T[K] extends Record<string, unknown>
    ? DotPaths<T[K], `${Prefix}${K}.`>
    : `${Prefix}${K}`
}[keyof T & (string | number)]

export type MessageId = DotPaths<typeof ptBRMessages>
