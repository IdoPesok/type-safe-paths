import z from "zod"
import { TypeSafePaths, createPathHelpers, inferPathProps } from "."

const paths = new TypeSafePaths({
  metadataSchema: z.object({
    allowedPermissions: z.array(z.enum(["user", "admin"])),
    testing: z.string(),
  }),
})
  .add("/posts/details/:postId", {
    metadata: {
      allowedPermissions: ["admin"],
      testing: "hello world",
    },
    searchParams: z.object({
      query: z.string().optional(),
    }),
  })
  .add("/posts/details/:postId/:commentId", {
    metadata: {
      allowedPermissions: ["user"],
      testing: "hello world",
    },
    searchParams: z.object({
      query: z.string().default("hello world"),
      optional: z.string().default(" the parsing worked"),
    }),
  })
  .add("/posts", {
    metadata: {
      allowedPermissions: ["user"],
      testing: "hello world",
    },
    searchParams: z.object({
      query: z.string().optional(),
    }),
  })
  .add("/api(.*)", {
    metadata: {
      allowedPermissions: ["user"],
      testing: "hello world",
    },
  })

const {
  buildPath,
  matchPath,
  parseSearchParamsForPath,
  extractParamsFromPathName,
} = createPathHelpers(paths)

type Test = inferPathProps<typeof paths, "/posts/details/:postId/:commentId">

const testPath = buildPath("/posts/details/:postId/:commentId", {
  params: {
    postId: "123",
    commentId: "456",
  },
  searchParams: {},
})

const match = matchPath("/posts/details/123/456?query=%22hello+world%22")

const testParams = new URLSearchParams()
testParams.set("query", '"hello world"')

const final = parseSearchParamsForPath(
  testParams,
  "/posts/details/:postId/:commentId"
)

console.log(testPath)
console.log(match)
console.log("final", final)
console.log(
  extractParamsFromPathName(
    "/posts/details/123/456?query=%22hello+world%22",
    "/posts/details/:postId/:commentId"
  )
)

console.log(buildPath("/api(.*)"))
