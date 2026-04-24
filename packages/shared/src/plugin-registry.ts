/**
 * Plugin Registry
 *
 * Defines all available plugins and their required environment variables/secrets.
 * Used by agent creation to auto-resolve required secrets from company registry.
 *
 * Plugin Definition Structure:
 * - name: Unique plugin identifier
 * - provider: External service provider (tavily, twitter, etc.)
 * - requiredSecrets: Array of secrets this plugin needs
 *   - envVar: Environment variable name in agent config
 *   - secretName: Name of the secret in company secrets registry
 *   - required: Whether this secret must exist (true) or is optional (false)
 */

export interface PluginSecretBinding {
  envVar: string;
  secretName: string;
  required: boolean;
}

export interface PluginDefinition {
  name: string;
  provider: string;
  requiredSecrets: PluginSecretBinding[];
}

export const PLUGIN_REGISTRY: Record<string, PluginDefinition> = {
  "web-search": {
    name: "web-search",
    provider: "tavily",
    requiredSecrets: [
      {
        envVar: "TAVILY_API_KEY",
        secretName: "tavily_api_key",
        required: true,
      },
    ],
  },
  "web-crawl": {
    name: "web-crawl",
    provider: "tavily",
    requiredSecrets: [
      {
        envVar: "TAVILY_API_KEY",
        secretName: "tavily_api_key",
        required: true,
      },
    ],
  },
  "x-api": {
    name: "x-api",
    provider: "twitter",
    requiredSecrets: [
      {
        envVar: "X_BEARER_TOKEN",
        secretName: "x_bearer_token",
        required: true,
      },
    ],
  },
  bitly: {
    name: "bitly",
    provider: "bitly",
    requiredSecrets: [
      {
        envVar: "BITLY_ACCESS_TOKEN",
        secretName: "bitly_access_token",
        required: true,
      },
    ],
  },
  slack: {
    name: "slack",
    provider: "slack",
    requiredSecrets: [
      {
        envVar: "SLACK_WEBHOOK_URL",
        secretName: "slack_webhook_url",
        required: false,
      },
    ],
  },
  github: {
    name: "github",
    provider: "github",
    requiredSecrets: [
      {
        envVar: "GITHUB_TOKEN",
        secretName: "github_token",
        required: true,
      },
    ],
  },
};

/**
 * Get plugin definition by name
 */
export function getPluginDefinition(pluginName: string): PluginDefinition | undefined {
  return PLUGIN_REGISTRY[pluginName];
}

/**
 * List all available plugins
 */
export function listAvailablePlugins(): string[] {
  return Object.keys(PLUGIN_REGISTRY);
}

/**
 * Get all required secrets for a list of plugins
 */
export function getRequiredSecretsForPlugins(
  pluginNames: string[],
): Map<string, PluginSecretBinding> {
  const secrets = new Map<string, PluginSecretBinding>();

  for (const pluginName of pluginNames) {
    const plugin = getPluginDefinition(pluginName);
    if (!plugin) {
      console.warn(`Plugin not found in registry: ${pluginName}`);
      continue;
    }

    for (const secret of plugin.requiredSecrets) {
      // Store by secretName to deduplicate across plugins
      // (e.g., multiple plugins might need TAVILY_API_KEY)
      secrets.set(secret.secretName, secret);
    }
  }

  return secrets;
}

/**
 * Validate that all required secrets exist in a company's secret registry
 *
 * Returns: { valid: boolean, missingSecrets: string[] }
 */
export function validatePluginSecretsAvailable(
  pluginNames: string[],
  availableSecretNames: string[],
): { valid: boolean; missingSecrets: string[] } {
  const requiredSecrets = getRequiredSecretsForPlugins(pluginNames);
  const missingSecrets: string[] = [];

  for (const [secretName, binding] of requiredSecrets) {
    if (binding.required && !availableSecretNames.includes(secretName)) {
      missingSecrets.push(secretName);
    }
  }

  return {
    valid: missingSecrets.length === 0,
    missingSecrets,
  };
}
