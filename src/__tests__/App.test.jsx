import React from 'react';
import { render, screen } from '@testing-library/react';
import App from '../App';

describe('App', () => {
  test('renders main app and AI banner', () => {
    render(<App />);
    expect(screen.getByText(/AI features are currently disabled/i)).toBeInTheDocument();
  });
});
