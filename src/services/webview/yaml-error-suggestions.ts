export function buildYamlParseErrorSuggestions(errorMessage: string): string[] {
  const suggestions: string[] = [];

  if (errorMessage.includes('duplicate key')) {
    suggestions.push('Duplicate YAML key detected. Check the repeated key name and keep only one entry.');
  } else if (errorMessage.includes('mapping values')) {
    suggestions.push('Invalid YAML mapping syntax. Check indentation and colon placement.');
  } else if (errorMessage.includes('unexpected end')) {
    suggestions.push('The YAML document ended too early. Check for an unclosed quote, bracket, or block.');
  } else if (errorMessage.includes('invalid character')) {
    suggestions.push('An invalid character was found. Check special characters and file encoding.');
  } else if (errorMessage.includes('too large') || errorMessage.includes('FileSizeError')) {
    suggestions.push('Reduce the YAML file size to 1MB or less.');
  }

  return suggestions;
}
