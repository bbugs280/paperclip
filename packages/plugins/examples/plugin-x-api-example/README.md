# X API Plugin for Paperclip

Comprehensive X.com (Twitter) API integration for Paperclip agents. Enables agents to search tweets, post, like, retweet, follow users, and more.

## Features

### Read-Only Tools (require bearer token)
- **x-search**: Search recent tweets
- **x-get-user**: Get user info by username
- **x-get-timeline**: Get user's recent tweets

### Write Tools (require access token)
- **x-post-tweet**: Post a new tweet
- **x-like**: Like a tweet
- **x-unlike**: Unlike a tweet
- **x-retweet**: Retweet
- **x-unretweet**: Remove retweet
- **x-follow**: Follow a user
- **x-unfollow**: Unfollow a user
- **x-delete-tweet**: Delete your tweet

## Setup

### 1. Get X API Credentials

You'll need X API v2 access. Go to [developer.twitter.com](https://developer.twitter.com):

1. Create a project and app
2. Generate credentials:
   - **Bearer Token** (for read-only access) - from the "Keys and tokens" tab
   - **Access Token & Secret** (for write access) - requires elevated access tier

### 2. Configure Plugin in Paperclip

1. Install the plugin:
   ```bash
   # Via npm (when published)
   npm install @paperclipai/plugin-x-api
   
   # Or via file path for development
   # Add to ~/.paperclip/adapter-plugins.json
   ```

2. In the Paperclip UI, go to your instance settings and add secrets:
   - `x_bearer_token`: Your bearer token (read-only access)
   - `x_access_token`: Your access token (write access)
   - `x_access_token_secret`: Your access token secret (for OAuth)

3. Enable the plugin in your agent's tools

## Usage Examples

### Search Tweets
```
Agent: Use x-search to find tweets about AI agents
Tool: x-search
Params: { "query": "AI agents", "maxResults": 10 }
```

### Get User Info
```
Tool: x-get-user
Params: { "username": "paperclipai" }
```

### Post a Tweet
```
Tool: x-post-tweet
Params: { "text": "Agents are awesome! 🚀" }
```

### Like a Tweet
```
Tool: x-like
Params: { "tweetId": "1234567890" }
```

### Follow User
```
Tool: x-follow  
Params: { "username": "elonmusk" }
```

## API Limits

- **Search**: 300 requests per 15 minutes (essential tier) or 2M per month (pro tier)
- **Tweets**: 50 requests per 15 minutes to create tweets
- **Actions**: Varies by tier (like, retweet, follow)

See [X API rate limits](https://developer.twitter.com/en/docs/platform/rate-limits) for details.

## Notes

- All parameters with usernames should be without the @ symbol
- Tweet IDs are numeric strings (e.g., "1234567890")
- Text tweets are limited to 280 characters
- Write operations require elevated access tier on X API

## Development

```bash
# Build
pnpm build

# Typecheck
pnpm typecheck

# Clean
pnpm clean
```

## Publishing

```bash
# Bump version in package.json
pnpm publish --access public
```
