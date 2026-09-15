import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';

describe('ConfirmDialog', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <ConfirmDialog open={false} title="Delete?" onConfirm={() => {}} onCancel={() => {}} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the title and description when open', () => {
    render(
      <ConfirmDialog open title="Delete this item?" description="This cannot be undone." onConfirm={() => {}} onCancel={() => {}} />
    );
    expect(screen.getByText('Delete this item?')).toBeInTheDocument();
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
  });

  it('calls onConfirm and onCancel appropriately', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<ConfirmDialog open title="Delete?" onConfirm={onConfirm} onCancel={onCancel} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /delete/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('disables buttons while busy', () => {
    render(<ConfirmDialog open title="Delete?" onConfirm={() => {}} onCancel={() => {}} busy />);
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /working/i })).toBeDisabled();
  });
});

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(<EmptyState title="No data" description="Nothing to show here yet." />);
    expect(screen.getByText('No data')).toBeInTheDocument();
    expect(screen.getByText('Nothing to show here yet.')).toBeInTheDocument();
  });

  it('renders an optional action', () => {
    render(<EmptyState title="No data" action={<button type="button">Add item</button>} />);
    expect(screen.getByRole('button', { name: /add item/i })).toBeInTheDocument();
  });
});
