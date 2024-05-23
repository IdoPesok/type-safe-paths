# TypeSafePaths

TypeSafePaths is a TypeScript library that provides a type-safe way to manage URL paths and their parameters in a web application. It leverages the power of Zod for schema validation, ensuring that both path parameters and search parameters conform to specified schemas.

## Features

- **Type-Safe URL Paths**: Define URL paths with type-safe parameters.
- **Schema Validation**: Use Zod schemas to validate search parameters and metadata.
- **Path Construction**: Easily build URLs from defined paths and parameters.
- **Path Matching**: Match and extract parameters from URLs.
- **Search Parameter Parsing**: Parse and validate search parameters from URLs.

## Installation

```bash
npm install type-safe-paths
```

## Usage

### Defining Paths

First, create an instance of `TypeSafePaths` and define your paths with the required schemas.

```typescript
import z from "zod"
import { TypeSafePaths, createPathHelpers } from "type-safe-paths"

// Create a new instance of TypeSafePaths with a metadata schema
const paths = new TypeSafePaths({
  metadataSchema: z.object({
    allowedPermissions: z.array(z.enum(["user", "admin"])),
    mustBeLoggedIn: z.boolean(),
  }),
})
  // Add the first path with metadata and search parameters
  .add("/posts/details/:postId", {
    metadata: {
      allowedPermissions: ["admin"],
      mustBeLoggedIn: true,
    },
    searchParams: z.object({
      query: z.string().optional(),
    }),
  })
  // Add a nested path with different metadata and search parameters
  .add("/posts/details/:postId/:commentId", {
    metadata: {
      allowedPermissions: ["user"],
      mustBeLoggedIn: false,
    },
    searchParams: z.object({
      query: z.string().default("hello world"),
      optional: z.string().default("the parsing worked"),
    }),
  })
```

### Creating Path Helpers

Use `createPathHelpers` to generate helper functions for building, matching, and parsing paths.

```typescript
const {
  buildPath,
  matchPath,
  parseSearchParamsForPath,
  extractParamsFromPathName,
} = createPathHelpers(paths)
```

### Building Paths

Construct a URL from a defined path and its parameters.

```typescript
// Build a URL for the path "/posts/details/:postId/:commentId"
const url = buildPath("/posts/details/:postId/:commentId", {
  params: {
    postId: "123",
    commentId: "456",
  },
  searchParams: {
    query: "example query",
  },
})

console.log(url)
// Output: /posts/details/123/456?query="example+query"
```

### Using buildPath with Next.js <Link>

You can use the `buildPath` function with Next.js <Link> component for type-safe routing.

```typescript
import Link from 'next/link';
import { buildPath } from 'type-safe-paths';

const postId = "123";
const commentId = "456";

const url = buildPath("/posts/details/:postId/:commentId", {
  params: { postId, commentId },
  searchParams: { query: "example query" },
});

const MyComponent = () => (
  <Link href={url}>
    <a>Go to Comment</a>
  </Link>
);

export default MyComponent;
```

### Matching Paths

Match a URL against the defined paths and extract metadata.

```typescript
// Match a URL against the registered paths
const matchResult = matchPath("/posts/details/123/456?query=example+query")

if (matchResult) {
  console.log(matchResult.path)
  // Output: /posts/details/:postId/:commentId

  console.log(matchResult.metadata)
  // Output: { allowedPermissions: ["user"], testing: "hello world" }
} else {
  console.log("No matching path found.")
}
```

### Parsing Search Parameters

Parse and validate search parameters from a URL.

```typescript
// Create a URLSearchParams instance with some query parameters
const searchParams = new URLSearchParams()
searchParams.set("query", "example query")

// Parse and validate the search parameters for the specified path
const parsedParams = parseSearchParamsForPath(
  searchParams,
  "/posts/details/:postId/:commentId"
)

console.log(parsedParams)
// Output: { query: "example query", optional: "the parsing worked" }
```

### Extracting Path Parameters

Extract path parameters from a URL based on a defined path.

```typescript
// Extract path parameters from a URL based on the specified path template
const params = extractParamsFromPathName(
  "/posts/details/123/456?query=example+query",
  "/posts/details/:postId/:commentId"
)

console.log(params)
// Output: { postId: "123", commentId: "456" }
```

### Inferring Types

Use `inferPathProps` to infer the types of path parameters and search parameters for a given path. This ensures that your components receive the correct types, enhancing type safety and reducing errors.

```typescript
import { inferPathProps } from "type-safe-paths";

// Infer types for the path "/posts/details/:postId/:commentId"
type PathProps = inferPathProps<typeof paths, "/posts/details/:postId/:commentId">;

// Example component using inferred types
export default async function MyPage({ params, searchParams }: PathProps) {
  // params and searchParams will have the correct types based on the defined schema
  console.log(params.postId); // string
  console.log(params.commentId); // string
  console.log(searchParams.query); // string
  console.log(searchParams.optional); // string

  // Your component logic here
  ...
}
```

This approach ensures that `params` and `searchParams` in your component have the correct types as specified in the path definition, making your code more robust and maintainable.

### Type-Safe Link Component

You can create a type-safe link component using the `inferLinkComponentProps` utility function. This ensures that the link component receives the correct props based on the defined paths.

````typescript
import Link from 'next/link'
import { TypeSafePaths, createPathHelpers, inferLinkComponentProps } from 'type-safe-paths'
import { forwardRef } from 'react'

// Create a new instance of TypeSafePaths
const paths = new TypeSafePaths({
  // Your path definitions here
  ...
})

// Create a type-safe link component
const TypeSafeLink = forwardRef<
  HTMLAnchorElement,
  inferLinkComponentProps<typeof paths, typeof Link>
>((props, ref) => {
  const { getHrefFromLinkComponentProps } = createPathHelpers(paths)
  return (
    <Link {...props} href={getHrefFromLinkComponentProps(props)} ref={ref}>
      {props.children}
    </Link>
  )
})

Certainly! Here's the updated README with a new section for the type-safe link using `inferLinkComponentProps`:

```markdown
# TypeSafePaths

...

## Usage

...

### Type-Safe Link Component

You can create a type-safe link component using the `inferLinkComponentProps` utility function. This ensures that the link component receives the correct props based on the defined paths.

```typescript
import Link from 'next/link'
import { TypeSafePaths, createPathHelpers, inferLinkComponentProps } from 'type-safe-paths'
import { forwardRef } from 'react'

// Create a new instance of TypeSafePaths
const myPaths = new TypeSafePaths({
  // Your path definitions here
  ...
})

// Create a type-safe link component
const TypeSafeLink = forwardRef<
  HTMLAnchorElement,
  inferLinkComponentProps<typeof myPaths, typeof Link>
>((props, ref) => {
  const { getHrefFromLinkComponentProps } = createPathHelpers(myPaths)
  return (
    <Link {...props} href={getHrefFromLinkComponentProps(props)} ref={ref}>
      {props.children}
    </Link>
  )
})
````

In this example, we create a `TypeSafeLink` component using `forwardRef`. The component receives props of type `inferLinkComponentProps<typeof myPaths, typeof Link>`, which infers the correct props based on the defined paths in `myPaths`.

Inside the component, we use the `getHrefFromLinkComponentProps` function from `createPathHelpers` to generate the `href` prop for the `Link` component based on the provided props.

Now you can use the `TypeSafeLink` component in your application, and it will ensure that the props you pass to it match the defined paths and their parameters.

```typescript
<TypeSafeLink
  href={{
    pathname: "/posts/details/:postId/:commentId",
    params: { postId: "123", commentId: "456" },
    searchParams: { query: "example query" },
  }}
>
  Go to Comment
</TypeSafeLink>
```

The `TypeSafeLink` component will provide type safety and autocomplete suggestions for the `path` and `params` props based on your defined paths.

## API

### `TypeSafePaths`

#### `constructor(args?: { metadataSchema?: TMetadataSchema })`

Creates an instance of `TypeSafePaths` with optional metadata schema.

#### `add<TPath extends string, TSearchParams extends z.AnyZodObject | undefined>(path: TPath, opts: { searchParams?: TSearchParams, metadata: z.input<TMetadataSchema> })`

Adds a path to the registry with optional search parameters and metadata.

### `createPathHelpers(registry: TypeSafePaths)`

#### `buildPath<TKey extends keyof TRegistry["$registry"]>(k: TKey, opts: { params: { [k in TRegistry["$registry"][TKey]["params"]]: string }, searchParams?: z.input<TRegistry["$registry"][TKey]["searchParams"]> })`

Builds a URL from a defined path and its parameters.

#### `matchPath(pathname: string)`

Matches a URL against the defined paths and extracts metadata.

#### `extractParamsFromPathName<TPath extends keyof TRegistry["$registry"]>(pathname: string, path: TPath)`

Extracts path parameters from a URL.

#### `parseSearchParamsForPath<TPath extends keyof TRegistry["$registry"]>(searchParams: URLSearchParams, path: TPath)`

Parses and validates search parameters from a URL.

### `inferPathProps`

#### `inferPathProps<TRegistry extends TypeSafePaths<any, any>, TPath extends keyof TRegistry["$registry"]>`

Infers the types of path parameters and search parameters for a given path.

### `inferLinkComponentProps`

#### `inferLinkComponentProps<TRegistry extends TypeSafePaths<any, any>, TLinkComponent extends React.ComponentType<any>>`

Infers the props for a type-safe link component based on the defined paths and the underlying link component.

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request on GitHub.

## Acknowledgments

This library was inspired by the need for a type-safe way to manage URL paths and parameters in modern web applications, leveraging the power of Zod for schema validation.

---

Feel free to reach out if you have any questions or need further assistance!

```

```
