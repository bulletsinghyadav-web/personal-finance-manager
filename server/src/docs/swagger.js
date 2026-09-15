const path = require('path');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

function serveApiDocs(app) {
  const spec = YAML.load(path.join(__dirname, 'openapi.yaml'));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec));
}

module.exports = { serveApiDocs };
