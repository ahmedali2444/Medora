const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const frontendApiFile = path.join(root, "frontend", "src", "api", "medoraApi.js");
const controllersDir = path.join(__dirname, "Medora", "Controllers");

function normalizePath(route) {
  let value = route.trim();
  value = value.replace(/\$\{[^}]+\}/g, (match, offset, source) => {
    return source[offset - 1] === "/" ? "{param}" : "";
  });
  value = value.split("?")[0];
  value = value.replace(/{[^}]+}/g, "{param}");
  value = value.replace(/\/+/g, "/").replace(/\/$/, "");
  return value.toLowerCase() || "/";
}

function extractFrontendRoutes() {
  const code = fs.readFileSync(frontendApiFile, "utf8");
  const routes = [];
  const callRegex = /api\.(get|post|put|delete|getBlob)\(\s*([`'"])(\/api\/[\s\S]*?)\2/g;
  let match;

  while ((match = callRegex.exec(code)) !== null) {
    const method = match[1] === "getBlob" ? "GET" : match[1].toUpperCase();
    routes.push({
      method,
      path: normalizePath(match[3]),
    });
  }

  return routes;
}

function extractBackendRoutes() {
  const routes = [];
  const files = fs.readdirSync(controllersDir).filter((file) => file.endsWith(".cs"));

  for (const file of files) {
    const content = fs.readFileSync(path.join(controllersDir, file), "utf8");
    const routeMatch = content.match(/\[Route\("([^"]+)"\)\]/);
    const baseRoute = routeMatch ? `/${routeMatch[1]}` : "";
    const methodRegex = /\[Http(Get|Post|Put|Delete)(?:\("([^"]*)"\))?\]/g;
    let match;

    while ((match = methodRegex.exec(content)) !== null) {
      const method = match[1].toUpperCase();
      const subRoute = match[2] || "";
      const fullPath = normalizePath(`${baseRoute}${subRoute ? `/${subRoute}` : ""}`);
      routes.push({ method, path: fullPath, file });
    }
  }

  return routes;
}

const frontendRoutes = extractFrontendRoutes();
const backendRoutes = extractBackendRoutes();
const backendSet = new Set(backendRoutes.map((route) => `${route.method} ${route.path}`));

console.log("Checking for Missing Backend Endpoints...");
let missing = 0;

for (const route of frontendRoutes) {
  const key = `${route.method} ${route.path}`;
  if (!backendSet.has(key)) {
    console.log(`[Missing in Backend] ${key}`);
    missing += 1;
  }
}

console.log(`Total missing: ${missing}`);
