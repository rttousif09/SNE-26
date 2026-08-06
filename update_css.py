import re

with open('src/index.css', 'r') as f:
    content = f.read()

# Update .sap-btn
content = re.sub(
    r'\.sap-btn \{[\s\S]*?\}',
    '''.sap-btn {
  background: var(--btn-gradient-top);
  border: 1px solid var(--btn-gradient-top);
  border-radius: 4px;
  padding: 4px 12px;
  color: #ffffff;
  cursor: pointer;
  box-shadow: none;
  font-weight: normal;
  font-family: var(--font-sans);
  transition: all 0.2s ease;
}''',
    content
)

content = re.sub(
    r'\.sap-btn:hover \{[\s\S]*?\}',
    '''.sap-btn:hover {
  background: var(--btn-hover-top);
  border-color: var(--btn-hover-top);
}''',
    content
)

content = re.sub(
    r'\.sap-btn:active \{[\s\S]*?\}',
    '''.sap-btn:active {
  background: var(--btn-active);
  box-shadow: none;
}''',
    content
)

# Update .sap-input
content = re.sub(
    r'\.sap-input \{[\s\S]*?\}',
    '''.sap-input {
  background-color: var(--input-bg);
  border: 1px solid #ccc;
  padding: 4px 8px;
  border-radius: 2px;
  color: var(--text-primary);
  font-family: var(--font-sans);
}''',
    content
)

content = re.sub(
    r'\.sap-input:focus \{[\s\S]*?\}',
    '''.sap-input:focus {
  outline: none;
  background-color: var(--input-focus-bg);
  border: 1px solid var(--color-sap-blue-val);
}''',
    content
)

content = re.sub(
    r'\.sap-input:read-only, \.sap-input:disabled \{[\s\S]*?\}',
    '''.sap-input:read-only, .sap-input:disabled {
  background-color: #f3f4f6;
}''',
    content
)

# Update .wbs-form-grid
content = re.sub(
    r'\.wbs-form-grid \{[\s\S]*?\}',
    '''.wbs-form-grid {
  display: grid;
  grid-template-columns: 200px 1fr;
  row-gap: 12px;
  align-items: center;
  background-color: transparent;
  padding: 16px;
  border: none;
}''',
    content
)

content = re.sub(
    r'\.wbs-form-grid > label \{[\s\S]*?\}',
    '''.wbs-form-grid > label {
  font-weight: normal;
  font-size: 14px;
  color: var(--text-secondary);
  text-align: right;
  padding-right: 16px;
}''',
    content
)


with open('src/index.css', 'w') as f:
    f.write(content)

