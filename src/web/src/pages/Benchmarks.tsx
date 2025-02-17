import React from 'react';
import styled from '@emotion/styled';
import { useAuth } from '../hooks/useAuth';
import BenchmarkAnalysis from '../components/metrics/BenchmarkAnalysis';
import LoadingSpinner from '../components/common/LoadingSpinner';

const Container = styled.div`
  padding: var(--spacing-lg);
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  margin-bottom: var(--spacing-xl);
`;

const Title = styled.h1`
  font-size: var(--font-size-2xl);
  color: var(--color-text);
  margin-bottom: var(--spacing-sm);
`;

const Description = styled.p`
  color: var(--color-text-light);
  font-size: var(--font-size-base);
`;

export const Benchmarks: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return (
      <Container>
        <div>Please log in to view benchmarks</div>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>Benchmark Analysis</Title>
        <Description>
          Compare your company's performance metrics against industry benchmarks and gain valuable
          insights into your market position.
        </Description>
      </Header>

      <BenchmarkAnalysis companyId={user.companyId} />
    </Container>
  );
};

export default Benchmarks;
