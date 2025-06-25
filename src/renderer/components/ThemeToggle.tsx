import React from 'react';
import { BaseComponent, BaseComponentProps } from './BaseComponent';

type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeToggleProps extends BaseComponentProps {}

interface ThemeToggleState {
  themeMode: ThemeMode;
  currentTheme: 'light' | 'dark';
}

export class ThemeToggle extends BaseComponent<ThemeToggleProps, ThemeToggleState> {
  protected defaultClassName = 'theme-toggle';

  state: ThemeToggleState = { themeMode: 'auto', currentTheme: 'dark' };

  constructor(props: ThemeToggleProps) {
    super(props);
    this.handleThemeChange = this.handleThemeChange.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
  }

  componentDidMount() {
    const savedMode = localStorage.getItem('textui-theme-mode') as ThemeMode;
    if (savedMode && ['light', 'dark', 'auto'].includes(savedMode)) {
      this.setState({ themeMode: savedMode }, this.updateCurrentTheme);
    } else {
      this.updateCurrentTheme();
    }

    window.addEventListener('message', this.handleMessage);
    this.updateBodyClass();
  }

  componentWillUnmount() {
    window.removeEventListener('message', this.handleMessage);
  }

  componentDidUpdate(prevProps: ThemeToggleProps, prevState: ThemeToggleState) {
    if (prevState.themeMode !== this.state.themeMode) {
      localStorage.setItem('textui-theme-mode', this.state.themeMode);
      this.updateCurrentTheme();
    }

    if (prevState.currentTheme !== this.state.currentTheme) {
      this.updateBodyClass();
    }
  }

  private updateCurrentTheme() {
    const { themeMode, currentTheme } = this.state;
    if (themeMode === 'auto') {
      const vscode = (window as any).vscode;
      if (vscode && vscode.getState) {
        const state = vscode.getState();
        const vscodeTheme = state?.theme || 'dark';
        const newTheme = vscodeTheme === 'light' ? 'light' : 'dark';
        if (newTheme !== currentTheme) {
          this.setState({ currentTheme: newTheme });
        }
      }
    } else if (themeMode !== currentTheme) {
      this.setState({ currentTheme: themeMode });
    }
  }

  private updateBodyClass() {
    const body = document.body;
    if (this.state.currentTheme === 'dark') {
      body.classList.add('dark');
      body.classList.remove('light');
    } else {
      body.classList.add('light');
      body.classList.remove('dark');
    }
  }

  private handleMessage(event: MessageEvent) {
    const message = event.data;
    if (message.type === 'theme-change' && this.state.themeMode === 'auto') {
      const newTheme = message.theme === 'light' ? 'light' : 'dark';
      this.setState({ currentTheme: newTheme });
    }
  }

  private handleThemeChange() {
    const modes: ThemeMode[] = ['auto', 'light', 'dark'];
    const currentIndex = modes.indexOf(this.state.themeMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    this.setState({ themeMode: modes[nextIndex] });
  }

  private getThemeIcon() {
    switch (this.state.themeMode) {
      case 'light':
        return '☀️';
      case 'dark':
        return '🌙';
      case 'auto':
        return '🔄';
      default:
        return '🌙';
    }
  }

  private getThemeLabel() {
    switch (this.state.themeMode) {
      case 'light':
        return 'ライト';
      case 'dark':
        return 'ダーク';
      case 'auto':
        return '自動';
      default:
        return '自動';
    }
  }

  render() {
    const { className } = this.props;

    return (
      <button
        onClick={this.handleThemeChange}
        className={this.mergeClassName(className)}
        title={`テーマ: ${this.getThemeLabel()} (クリックで切り替え)`}
        style={{
          position: 'fixed',
          top: '1rem',
          right: '6rem',
          backgroundColor: 'rgba(75, 85, 99, 0.8)',
          color: '#d1d5db',
          border: '1px solid rgba(107, 114, 128, 0.5)',
          padding: '0.5rem 0.75rem',
          borderRadius: '0.375rem',
          fontSize: '0.875rem',
          cursor: 'pointer',
          transition: 'all 0.2s',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '2.5rem',
          minWidth: '3rem',
          width: '3rem'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(55, 65, 81, 0.9)';
          e.currentTarget.style.borderColor = 'rgba(75, 85, 99, 0.7)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(75, 85, 99, 0.8)';
          e.currentTarget.style.borderColor = 'rgba(107, 114, 128, 0.5)';
        }}
      >
        <span style={{ fontSize: '1rem' }}>{this.getThemeIcon()}</span>
      </button>
    );
  }

