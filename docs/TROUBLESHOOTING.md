# Troubleshooting Guide

Common issues and their solutions.

## Setup Issues

### "Cannot find module 'wrangler'"

**Problem:** Wrangler CLI not installed or not in PATH.

**Solution:**
```bash
npm install -g wrangler
# Or use npx:
npx wrangler dev
```

### KV Namespace Errors

**Problem:** `Error: A KV namespace must be provided`

**Solution:**
1. Create the namespace:
   ```bash
   npx wrangler kv:namespace create "RESUME_DATA"
   ```
2. Copy the ID to `wrangler.toml`:
   ```toml
   [[kv_namespaces]]
   binding = "RESUME_DATA"
   id = "YOUR_NAMESPACE_ID"
   ```

### "OPENAI_API_KEY is not defined"

**Problem:** Environment variable not set.

**Solution:**

For local development:
1. Create `.dev.vars` file:
   ```
   OPENAI_API_KEY=sk-your-key-here
   ADMIN_SECRET=your-secret
   ```

For production:
1. Go to Cloudflare Dashboard → Your Project → Settings
2. Environment Variables → Add
3. Add `OPENAI_API_KEY` and `ADMIN_SECRET`

### "wrangler login" Issues

**Problem:** Authentication fails or hangs.

**Solution:**
```bash
# Clear existing credentials
rm -rf ~/.wrangler

# Login again
npx wrangler login
```

If browser doesn't open:
```bash
npx wrangler login --browser=false
# Copy the URL manually
```

## Runtime Issues

### Chat Not Responding

**Symptoms:**
- Spinning indicator never stops
- No response from chat

**Debugging Steps:**

1. **Check browser console** (F12 → Console tab)
   - Look for error messages
   - Network tab → check `/api/chat` request

2. **Check API response:**
   ```bash
   curl -X POST http://localhost:8788/api/chat \
     -H "Content-Type: application/json" \
     -d '{"message": "hello"}'
   ```

3. **Verify OpenAI API key:**
   - Check it's valid at [platform.openai.com](https://platform.openai.com)
   - Check for billing issues (free tier has limits)

4. **Check Wrangler logs:**
   ```bash
   # Run with verbose output
   npx wrangler pages dev public --log-level debug
   ```

### "OpenAI API error" or Rate Limits

**Problem:** OpenAI returning errors.

**Solutions:**

1. **Check API key validity:**
   - Go to [platform.openai.com](https://platform.openai.com/api-keys)
   - Verify key is active and has credits

2. **Rate limit exceeded:**
   - Wait a few minutes
   - Consider upgrading OpenAI plan
   - Implement caching for common questions

3. **Invalid request:**
   - Check `functions/api/chat.js` for malformed requests
   - Verify context JSON is valid

### Chat Shows "Sorry, I encountered an error"

**Check the server logs:**

Development:
- Look at terminal running `npm run dev`

Production:
- Cloudflare Dashboard → Your Project → Functions → Logs

### Logs Dashboard Shows "Unauthorized"

**Problem:** Can't access `/api/logs`

**Solution:**
1. Verify your `ADMIN_SECRET` is set correctly
2. Use correct URL format:
   ```
   /api/logs?auth=YOUR_ADMIN_SECRET
   ```
3. Check for typos in the secret

## Deployment Issues

### Build Fails on Cloudflare

**Problem:** Deployment fails during build.

**Solutions:**

1. **Check build settings:**
   - Build command: (leave empty)
   - Build output directory: `public`
   - Framework preset: None

2. **Verify file structure:**
   - `public/` folder exists
   - `functions/` folder exists
   - No syntax errors in JS files

### Functions Not Working in Production

**Problem:** Chat works locally but not on deployed site.

**Checklist:**

1. **Environment variables set?**
   - Cloudflare Dashboard → Settings → Environment Variables
   - Both `OPENAI_API_KEY` and `ADMIN_SECRET` must be set

2. **KV namespace bound?**
   - Settings → Functions → KV namespace bindings
   - Variable name must be `RESUME_DATA`

3. **Context uploaded to production KV?**
   ```bash
   npx wrangler kv:key put \
     --namespace-id "YOUR_PROD_NAMESPACE_ID" \
     "hidden-context" \
     --path src/context/hidden-context.json
   ```

### Context Not Loading

**Problem:** AI gives generic responses, doesn't know your info.

**Solutions:**

1. **Upload context:**
   ```bash
   # Development
   npm run upload-context

   # Production
   npx wrangler kv:key put \
     --namespace-id "YOUR_NAMESPACE_ID" \
     "hidden-context" \
     --path src/context/hidden-context.json
   ```

2. **Verify context:**
   ```bash
   npx wrangler kv:key get \
     --namespace-id "YOUR_NAMESPACE_ID" \
     "hidden-context"
   ```

3. **Check JSON validity:**
   ```bash
   # Should output nothing if valid
   node -e "require('./src/context/hidden-context.json')"
   ```

### Custom Domain Not Working

**Problem:** Custom domain shows error or wrong site.

**Solutions:**

1. **DNS propagation:** Wait 24-48 hours
2. **Check DNS settings:**
   - Cloudflare Dashboard → Your Domain → DNS
   - Should have CNAME to `your-project.pages.dev`
3. **SSL/TLS mode:** Set to "Full" or "Full (strict)"

## Performance Issues

### Slow Response Times

**Possible causes:**

1. **Cold starts:** First request after idle may take 1-2s
   - Solution: This is normal for serverless

2. **Large context:** Too much data sent to OpenAI
   - Solution: Smart context selection should handle this
   - Check that `getRelevantContext()` is working

3. **OpenAI latency:** ~500ms-2s is normal
   - Solution: Consider using GPT-3.5-turbo instead of GPT-4

### High API Costs

**Solutions:**

1. **Use GPT-3.5-turbo** (default):
   ```javascript
   model: 'gpt-3.5-turbo',  // ~20x cheaper than GPT-4
   ```

2. **Verify smart context selection:**
   - Add logging to see context size:
   ```javascript
   console.log('Context size:', JSON.stringify(relevantContext).length);
   ```

3. **Reduce max_tokens:**
   ```javascript
   max_tokens: 300,  // Shorter responses = lower cost
   ```

4. **Implement rate limiting** (see Architecture guide)

## Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `No message provided` | Empty request body | Check frontend sending correct data |
| `Failed to get context data` | KV read error | Verify KV namespace binding |
| `OpenAI API error` | Invalid API key or quota | Check OpenAI dashboard |
| `Unauthorized` | Wrong admin secret | Verify ADMIN_SECRET |
| `A KV namespace must be provided` | Missing KV binding | Add binding in wrangler.toml |

## Getting Help

If you're still stuck:

1. **Check existing issues:** [GitHub Issues](https://github.com/YOUR_USERNAME/talkingresume/issues)
2. **Open a new issue** with:
   - Error message
   - Steps to reproduce
   - Environment (local/production)
   - Relevant logs

## Debug Mode

For detailed debugging, add this to `functions/api/chat.js`:

```javascript
// At the top of onRequest()
console.log('Request headers:', Object.fromEntries(context.request.headers));
console.log('Environment:', Object.keys(context.env));

// Before OpenAI call
console.log('Sending to OpenAI:', {
    contextSize: JSON.stringify(relevantContext).length,
    messageLength: message.length
});
```

View logs:
- Development: Terminal output
- Production: Cloudflare Dashboard → Functions → Logs
