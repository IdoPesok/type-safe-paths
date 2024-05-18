import { pathToRegexp } from "path-to-regexp"
import z from "zod"

type Length<T extends any[]> = T extends { length: infer L } ? L : never

type IsEmptyObject<T> = keyof T extends never ? true : false

type BuildTuple<L extends number, T extends any[] = []> = T extends {
  length: L
}
  ? T
  : BuildTuple<L, [...T, any]>

type Add<A extends number, B extends number> = Length<
  [...BuildTuple<A>, ...BuildTuple<B>]
>

type PrettifyNested<T> = {
  [K in keyof T]: T[K] extends Object ? PrettifyNested<T[K]> : T[K]
} & {}

type Banned =
  | `${string}${"." | " " | "/" | "#" | "&" | "?" | "|" | ":"}${string}`
  | ``
type Segment<T extends String> = T extends Banned ? never : T

type MAX_DEPTH = 5
type Path<
  TSegmentValue extends string,
  TDepth extends number = 0,
> = TDepth extends MAX_DEPTH
  ? never
  :
      | (TDepth extends 0 ? `/` : ``)
      | "(.*)"
      | `/${":" | ""}${Segment<TSegmentValue>}${Path<TSegmentValue, TDepth extends number ? Add<TDepth, 1> : never>}`

type TExtractPathFromString<T extends string> =
  T extends Path<infer TSegmentValue> ? Path<TSegmentValue> : never

type TExtractSegmentFromPath<T extends Path<string>> =
  T extends Path<infer TSegmentValue> ? TSegmentValue : never

type TExtractParamsFromSegment<T extends string> = T extends `:${infer P}`
  ? P extends Banned
    ? never
    : P
  : never

interface TPathRegistryNode<
  TKeys extends string,
  TSearchParams extends z.AnyZodObject | undefined,
> {
  params: TKeys
  searchParams: TSearchParams
}

type TPathsRegistryObject = {
  [key: string]: TPathRegistryNode<any, any>
}

export class TypeSafePaths<
  TPathsRegistry extends TPathsRegistryObject = {},
  TMetadataSchema extends z.ZodType | undefined = undefined,
> {
  $metadataSchema: TMetadataSchema | undefined
  $registry: TPathsRegistry
  $dataMap: Record<
    keyof TPathsRegistry,
    {
      searchParamsSchema: z.ZodType
      metadata: TMetadataSchema extends z.ZodType
        ? z.input<TMetadataSchema>
        : undefined
    }
  >

  constructor(args?: { metadataSchema?: TMetadataSchema }) {
    this.$metadataSchema = args?.metadataSchema

    this.$registry = 5 as any
    this.$dataMap = {} as any
  }

  add<
    const TPath extends string,
    TSearchParams extends z.AnyZodObject | undefined,
  >(
    path: TExtractPathFromString<TPath> extends never
      ? never
      : TPath extends keyof TPathsRegistry
        ? never
        : TPath,
    opts: {
      searchParams?: TSearchParams
    } & (TMetadataSchema extends z.ZodType
      ? {
          metadata: z.input<TMetadataSchema>
        }
      : {})
  ): TypeSafePaths<
    TPathsRegistry & {
      [k in TPath]: TPath extends Path<string>
        ? TPathRegistryNode<
            TExtractParamsFromSegment<TExtractSegmentFromPath<TPath>>,
            TSearchParams
          >
        : never
    },
    TMetadataSchema
  > {
    // @ts-expect-error
    this.$dataMap[path] = {
      searchParamsSchema: opts.searchParams,
      metadata: "metadata" in opts ? opts.metadata : undefined,
    }

    return this as any
  }
}

export const createPathHelpers = <
  const TRegistry extends TypeSafePaths<any, any>,
>(
  registry: TRegistry
) => {
  type TSearchParams<TKey extends keyof TRegistry["$registry"]> =
    TRegistry["$registry"][TKey]["searchParams"]

  type TParams<TKey extends keyof TRegistry["$registry"]> =
    TRegistry["$registry"][TKey]["params"]

  type TOpts<TKey extends keyof TRegistry["$registry"]> =
    (TParams<TKey> extends never
      ? {}
      : {
          params: {
            [k in TRegistry["$registry"][TKey]["params"]]: string
          }
        }) &
      (TSearchParams<TKey> extends z.AnyZodObject
        ? {
            searchParams: z.input<TSearchParams<TKey>>
          }
        : {}) & {}

  const buildPath = <TKey extends keyof TRegistry["$registry"]>(
    k: TKey,
    ...optsArr: IsEmptyObject<TOpts<TKey>> extends true ? [] : [TOpts<TKey>]
  ): string => {
    let mutatedPath = k.toString()

    const opts = optsArr[0]

    // replace params in path
    if (opts && "params" in opts && opts.params) {
      for (const [key, value] of Object.entries(opts.params)) {
        mutatedPath = mutatedPath.replace(`:${key}`, value as string)
      }
    }

    const dummyBase = "http://localhost"

    // remove regex from path
    if (mutatedPath.includes("(.*)")) {
      mutatedPath = mutatedPath.replace("(.*)", "")
    }

    const url = new URL(mutatedPath, dummyBase)

    if (opts && !("searchParams" in opts)) {
      return url.pathname
    }

    let parsed = opts && "searchParams" in opts ? opts.searchParams : undefined

    const schema = registry.$dataMap[k].searchParamsSchema || undefined
    if (schema) {
      parsed = schema.parse(parsed)
    }

    if (!parsed) return url.pathname

    // add search params
    for (const [key, value] of Object.entries(parsed)) {
      url.searchParams.set(key, JSON.stringify(value))
    }

    return url.pathname + url.search
  }

  const matchPath = (
    pathname: string
  ):
    | {
        path: keyof TRegistry["$registry"]
        metadata: TRegistry extends TypeSafePaths<any, infer TMetadataSchema>
          ? TMetadataSchema extends z.ZodType
            ? z.output<TMetadataSchema>
            : undefined
          : undefined
      }
    | undefined => {
    const found = Object.keys(registry.$dataMap).find((path) => {
      const re = pathToRegexp(path)
      const match = re.exec(pathname.split("?")[0] || "NEVER_MATCH")

      if (!match) {
        return false
      }

      return true
    })

    if (!found) return undefined

    return {
      path: found as keyof TRegistry["$registry"],
      metadata: registry.$metadataSchema
        ? registry.$metadataSchema.parse(
            registry.$dataMap[found]?.metadata || {}
          )
        : undefined,
    }
  }

  const extractParamsFromPathName = <
    TPath extends keyof TRegistry["$registry"],
  >(
    pathname: string,
    path: TPath
  ): TRegistry["$registry"][TPath]["params"] => {
    const finalParams: Record<string, string> = {}

    let basePathSplit = (path as string).split("/")
    let pathSplit = (pathname.split("?")[0] || "NEVER_MATCH").split("/")

    if (basePathSplit.length !== pathSplit.length) {
      return null
    }

    // copy over the params
    for (let i = 0; i < basePathSplit.length; i++) {
      const basePathPart = basePathSplit[i]
      const pathPart = pathSplit[i]

      if (!basePathPart || !pathPart) {
        continue
      }

      if (basePathPart.startsWith(":")) {
        const foundPathPartName = basePathPart.slice(1)
        finalParams[foundPathPartName] = pathPart
      }
    }

    return finalParams
  }

  const parseSearchParamsForPath = <TPath extends keyof TRegistry["$registry"]>(
    searchParams: URLSearchParams,
    path: TPath
  ): TRegistry["$registry"][TPath]["searchParams"] extends z.AnyZodObject
    ? z.output<TRegistry["$registry"][TPath]["searchParams"]>
    : undefined => {
    const result: any = {}

    searchParams.forEach((value, key) => {
      const k = key
      try {
        result[k] = JSON.parse(value)
      } catch (e) {
        result[k] = value
      }
    })

    const schema = registry.$dataMap[path].searchParamsSchema || undefined
    if (schema) {
      return schema.parse(result)
    }

    return result
  }

  return {
    /**
     * Builds a path from a path with params and search params
     */
    buildPath,

    /**
     * Matches a pathname against the paths in the registry
     */
    matchPath,

    /**
     * Extracts the params from a pathname for a given path
     */
    extractParamsFromPathName,

    /**
     * Parses the search params for a path
     */
    parseSearchParamsForPath,
  }
}

export type inferPathProps<
  TRegistry extends TypeSafePaths<any, any>,
  TPath extends keyof TRegistry["$registry"],
> = PrettifyNested<{
  params: {
    [K in TRegistry["$registry"][TPath]["params"]]: string
  }
  searchParams: TRegistry["$registry"][TPath]["searchParams"] extends z.AnyZodObject
    ? z.input<TRegistry["$registry"][TPath]["searchParams"]>
    : undefined
}>
