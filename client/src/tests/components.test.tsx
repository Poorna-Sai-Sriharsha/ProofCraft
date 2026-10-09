import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { WarrantyBadge, ClaimBadge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { ShoppingBag } from 'lucide-react';

describe('Frontend Component Unit Tests', () => {
  describe('WarrantyBadge Component', () => {
    it('should render Active Coverage badge for ACTIVE status', () => {
      render(<WarrantyBadge status="ACTIVE" />);
      expect(screen.getByText('Active Coverage')).toBeInTheDocument();
    });

    it('should render Expiring Soon badge when active with <= 30 days remaining', () => {
      render(<WarrantyBadge status="ACTIVE" daysRemaining={14} />);
      expect(screen.getByText('Expiring in 14d')).toBeInTheDocument();
    });

    it('should render Expired badge for EXPIRED status', () => {
      render(<WarrantyBadge status="EXPIRED" />);
      expect(screen.getByText('Expired')).toBeInTheDocument();
    });

    it('should render No Warranty badge for NONE status', () => {
      render(<WarrantyBadge status="NONE" />);
      expect(screen.getByText('No Warranty')).toBeInTheDocument();
    });

    it('should render Unknown badge for UNKNOWN status', () => {
      render(<WarrantyBadge status="UNKNOWN" />);
      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });
  });

  describe('ClaimBadge Component', () => {
    it('should render Claim Approved badge', () => {
      render(<ClaimBadge status="APPROVED" />);
      expect(screen.getByText('Claim Approved')).toBeInTheDocument();
    });

    it('should render Claim Pending badge', () => {
      render(<ClaimBadge status="PENDING" />);
      expect(screen.getByText('Claim Pending')).toBeInTheDocument();
    });

    it('should render Claim Rejected badge', () => {
      render(<ClaimBadge status="REJECTED" />);
      expect(screen.getByText('Claim Rejected')).toBeInTheDocument();
    });
  });

  describe('EmptyState Component', () => {
    it('should render title, description and action link', () => {
      render(
        <BrowserRouter>
          <EmptyState
            icon={ShoppingBag}
            title="No purchases found"
            description="Your vault currently has no records."
            actionText="Add Purchase"
            actionHref="/purchases/new"
          />
        </BrowserRouter>
      );

      expect(screen.getByText('No purchases found')).toBeInTheDocument();
      expect(screen.getByText('Your vault currently has no records.')).toBeInTheDocument();
      expect(screen.getByText('Add Purchase')).toBeInTheDocument();
    });
  });
});
