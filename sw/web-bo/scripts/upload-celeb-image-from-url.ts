/**
 * @deprecated Identity-safe avatar registration is owned by upload-celeb-avatar.ts.
 *
 * This legacy URL crawler used a retired crop pipeline and could register an image
 * without the required independent identity evidence. It remains as a fail-fast
 * compatibility entry point so old commands cannot silently use the unsafe path.
 */
throw new Error(
  'RETIRED: use upload-celeb-avatar.ts with --image-url/--image-file, --identity-evidence, and --source-note.',
)
