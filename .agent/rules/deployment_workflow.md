# Deployment Workflow

Before deploying to production (Skynet), always follow this sequence:

1. **Build locally**: Run `bun run build` and confirm it succeeds with no errors.
2. **Test locally**: Run `bun run dev` and verify the affected functionality works in the browser (http://localhost:3000). Check relevant pages, not just a build pass.
3. **Commit and push**: Only after local verification passes.
4. **Deploy**: Run `bun run deploy` to rsync files to Skynet and rebuild the Docker container.
5. **Verify production**: Check `ssh miro@skynet "docker logs shared-lists-web --tail 20"` for startup errors after deploy.

Never deploy untested changes directly to production.
