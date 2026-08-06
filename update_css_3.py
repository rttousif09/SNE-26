import re

with open('src/index.css', 'r') as f:
    content = f.read()

# Update body
content = re.sub(
    r'body \{[\s\S]*?\}',
    '''body {
  margin: 0;
  padding: 0;
  background-color: var(--color-sap-bg-val);
  color: var(--text-primary);
  font-family: "72", "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 14px;
}''',
    content
)

with open('src/index.css', 'w') as f:
    f.write(content)

