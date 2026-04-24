/**
 * Plugin Secret Resolver
 *
 * Resolves plugin declarations to environment variable configurations by looking up
 * required secrets from the company's secret registry.
 *
 * Used during agent creation to auto-populate adapterConfig.env when plugins array is provided.
 */

import {
  PLUGIN_REGISTRY,
  getRequiredSecretsForPlugins,
  validatePluginSecretsAvailable,
} from "@paperclipai/shared";
import type { Db } from "@paperclipai/db";
import { secretService } from "./secrets.js";

export interface ResolvePluginSecretsOptions {
  companyId: string;
  plugins: string[];
  existingEnv?: Record<string, unknown>;
  strictMode?: boolean;
}

export interface ResolvePluginSecretsResult {
  env: Record<string, unknown>;
  missingSecrets: string[];
  resolvedPlugins: string[];
}

/**
 * Resolve plugin secrets to environment variable configuration
 *
 * Given a list of plugin names, looks up required secrets from the company's secret registry
 * and returns them as secret references in the format expected by adapterConfig.env.
 *
 * Strict mode: throws if any required secret is missing
 * Lenient mode: includes missing secrets in result, still populates available ones
 */
export async function resolvePluginSecrets(
  db: Db,
  options: ResolvePluginSecretsOptions,
): Promise<ResolvePluginSecretsResult> {
  const {
    companyId,
    plugins,
    existingEnv = {},
    strictMode = false,
  } = options;

  if (!plugins || plugins.length === 0) {
    return {
      env: existingEnv,
      missingSecrets: [],
      resolvedPlugins: [],
    };
  }

  // Get all secrets in this company
  const secretsSvc = secretService(db);
  const companySecrets = await secretsSvc.list(companyId);
  const availableSecretNames = companySecrets.map((s: typeof companySecrets[0]) => s.name);

  // Validate plugins and get required secrets
  const { valid, missingSecrets } = validatePluginSecretsAvailable(plugins, availableSecretNames);

  if (strictMode && !valid) {
    throw new Error(
      `Plugin resolution failed: missing required secrets in company: ${missingSecrets.join(", ")}`
    );
  }

  // Get the required secrets mapping
  const requiredSecrets = getRequiredSecretsForPlugins(plugins);

  // Build environment config with secret references
  const resolvedEnv = { ...existingEnv };

  for (const [secretName, binding] of requiredSecrets) {
    const secret = companySecrets.find((s: typeof companySecrets[0]) => s.name === secretName);

    if (secret) {
      // Secret exists, add as reference
      resolvedEnv[binding.envVar] = {
        type: "secret_ref",
        secretId: secret.id,
        version: "latest",
      };
    } else if (binding.required) {
      // Required secret missing - only include if not in strict mode
      if (!strictMode) {
        resolvedEnv[binding.envVar] = {
          type: "secret_ref",
          secretId: `NOT_FOUND:${secretName}`,
          version: "latest",
        };
      }
    }
    // Optional secrets are just skipped if not found
  }

  return {
    env: resolvedEnv,
    missingSecrets,
    resolvedPlugins: plugins,
  };
}

/**
 * Validate that required secrets exist (used in pre-deployment checks)
 */
export async function validatePluginRequirementsForCompany(
  db: Db,
  companyId: string,
  plugins: string[],
): Promise<{
  valid: boolean;
  missingSecrets: string[];
  pluginsResolvable: boolean;
}> {
  if (!plugins || plugins.length === 0) {
    return { valid: true, missingSecrets: [], pluginsResolvable: true };
  }

  const secretsSvc = secretService(db);
  const companySecrets = await secretsSvc.list(companyId);
  const availableSecretNames = companySecrets.map((s: typeof companySecrets[0]) => s.name);

  const { valid, missingSecrets } = validatePluginSecretsAvailable(plugins, availableSecretNames);

  return {
    valid,
    missingSecrets,
    pluginsResolvable: valid,
  };
}
