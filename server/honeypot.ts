import type { Request, Response, NextFunction } from "express";

export const HONEYPOT_PATHS = new Set<string>([
  // Environment & secrets
  "/.env", "/.env.local", "/.env.production", "/.env.backup", "/.env.example",
  "/.env.dev", "/.env.staging", "/.env.test",
  // Git
  "/.git", "/.git/config", "/.git/HEAD", "/.gitignore", "/.gitconfig",
  // Server config
  "/.htaccess", "/.htpasswd", "/web.config", "/WebConfig", "/appsettings.json",
  // Admin panels
  "/admin", "/admin/", "/administrator", "/admin.php", "/admin.html",
  "/Admin", "/ADMIN",
  // WordPress (common scanner target even on non-WP sites)
  "/wp-admin", "/wp-admin/", "/wp-login.php", "/wp-config.php", "/wordpress",
  "/wp-includes", "/wp-content",
  "/xmlrpc.php",
  // PHP admin tools
  "/phpmyadmin", "/phpmyadmin/", "/pma", "/myadmin", "/mysql",
  // Config / backup
  "/config", "/config.php", "/configuration.php", "/config.yml", "/config.yaml",
  "/backup", "/backups", "/backup.sql", "/db.sql", "/database.sql",
  "/dump.sql", "/data.sql", "/site.sql",
  // Debug / shell
  "/debug", "/trace", "/console", "/shell", "/cmd", "/exec",
  "/test.php", "/info.php", "/phpinfo.php",
  // Server status
  "/server-status", "/server-info", "/nginx-status", "/nginx_status",
  "/apache-status",
  // Java / Spring Boot actuator
  "/actuator", "/actuator/env", "/actuator/health", "/actuator/info",
  "/actuator/beans", "/actuator/metrics", "/actuator/mappings",
  // Tomcat manager
  "/manager", "/manager/html", "/manager/text",
  // Search engine admin
  "/solr", "/solr/admin", "/elasticsearch", "/elastic", "/_cat",
  // CI/CD
  "/jenkins", "/jenkins/", "/hudson", "/gitlab",
  // Cloud credentials
  "/.aws", "/.aws/credentials", "/.azure", "/.gcloud",
  "/aws-config", "/aws.yml",
  // API probes
  "/api/admin", "/api/debug", "/api/config", "/api/env",
  "/api/v1/admin", "/api/v2/admin", "/api/internal",
  // GraphQL (NexusOS is REST only)
  "/graphql", "/api/graphql", "/gql",
  // Monitoring (we have our own)
  "/metrics", "/prometheus", "/_metrics",
  // Swagger / OpenAPI (not public)
  "/swagger", "/swagger-ui", "/swagger-ui.html", "/swagger-ui/",
  "/api-docs", "/api-docs/", "/openapi.json", "/openapi.yaml",
  "/v2/api-docs", "/v3/api-docs",
  // Unix system files
  "/etc/passwd", "/etc/shadow", "/etc/hosts",
  "/proc/self/environ",
  // CMS targets
  "/joomla", "/drupal", "/typo3", "/magento", "/prestashop",
  // Common recon targets
  "/robots.bak", "/sitemap.bak",
  "/credentials", "/secrets", "/private",
  "/cgi-bin", "/cgi-bin/",
  // Node.js specific
  "/package.json", "/package-lock.json", "/yarn.lock",
  "/node_modules",
]);

export function honeypotMiddleware(req: Request, res: Response, next: NextFunction) {
  const p = req.path;
  if (HONEYPOT_PATHS.has(p) || HONEYPOT_PATHS.has(p.toLowerCase())) {
    res.locals.honeypotHit = true;
    return res.status(404).json({ error: "Not found" });
  }
  next();
}

export function isHoneypotPath(p: string): boolean {
  return HONEYPOT_PATHS.has(p) || HONEYPOT_PATHS.has(p.toLowerCase());
}
