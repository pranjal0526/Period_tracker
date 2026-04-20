const isProduction = process.env.NODE_ENV === "production";

export function readServerEnv(
  name: string,
  options?: {
    developmentFallback?: string;
  },
) {
  const value = process.env[name];

  if (value) {
    return value;
  }

  if (!isProduction && options?.developmentFallback) {
    return options.developmentFallback;
  }

  throw new Error(
    `Missing required environment variable: ${name}. Add it before running authenticated or encrypted flows.`,
  );
}
