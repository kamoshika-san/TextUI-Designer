export interface PreviewThemeFilePort {
  getDirectoryPath(filePath: string): string;
  resolveThemePathForDirectory(directoryPath: string): string | undefined;
}
