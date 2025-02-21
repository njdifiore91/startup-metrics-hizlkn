import React, { useCallback } from 'react';
import styled from '@emotion/styled';
import Select from '../common/Select';
import { api } from '../../services/api';

interface IDataSource {
  id: string;
  name: string;
  description: string;
  dataFormat: string;
}

interface ApiResponse {
  status: string;
  data: IDataSource[];
  metadata?: {
    timestamp: string;
    duration: number;
    headers: {
      'content-length': string;
      'content-type': string;
    };
  };
}

interface DataSourceSelectorProps {
  selectedDataSourceId: string;
  onDataSourceSelect: (dataSourceId: string, dataSource: IDataSource) => void;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}

const StyledDataSourceSelector = styled.div`
  width: 100%;
  max-width: 400px;
  padding: var(--spacing-md) 0;

  .select-wrapper {
    width: 100%;
  }

  .select-container {
    width: 100%;
  }

  select {
    padding: 16px 20px;
    width: 100%;
    height: 56px;
    font-size: var(--font-size-base);
    line-height: 1.5;
  }

  /* Style the Select component's container */
  div[class*='Select'] {
    min-height: 56px;
  }

  /* Style the Select component's control */
  div[class*='control'] {
    min-height: 56px !important;
    padding: 4px 8px;
  }

  /* Style the Select component's value container */
  div[class*='valueContainer'] {
    padding: 8px 12px;
  }

  /* Style the Select component's input */
  div[class*='input'] {
    margin: 0;
    padding: 0;
  }
`;

const DataSourceSelector: React.FC<DataSourceSelectorProps> = React.memo(
  ({
    selectedDataSourceId,
    onDataSourceSelect,
    disabled = false,
    className = '',
    ariaLabel = 'Select a data source',
  }) => {
    const [dataSources, setDataSources] = React.useState<IDataSource[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
      const fetchDataSources = async () => {
        setLoading(true);
        setError(null);
        try {
          const response = await api.get<ApiResponse>('/api/v1/data-sources');
          setDataSources(response.data.data);
        } catch (error) {
          console.error('Error fetching data sources:', error);
          setError('Failed to fetch data sources');
        } finally {
          setLoading(false);
        }
      };

      fetchDataSources();
    }, []);

    const options = React.useMemo(() => {
      return dataSources.map((dataSource) => ({
        value: dataSource.id,
        label: dataSource.name,
        description: dataSource.description,
      }));
    }, [dataSources]);

    const handleChange = useCallback(
      (value: string | number) => {
        const selectedOption = dataSources.find((ds) => ds.id === value);
        if (selectedOption) {
          onDataSourceSelect(String(value), selectedOption);
        }
      },
      [dataSources, onDataSourceSelect]
    );

    return (
      <StyledDataSourceSelector className={className}>
        <Select
          options={options}
          value={selectedDataSourceId}
          onChange={handleChange}
          name="data-source-selector"
          id="data-source-selector"
          placeholder="Choose a data source..."
          disabled={disabled || loading}
          error={!loading ? error || '' : ''}
          loading={loading}
          required
          aria-label={ariaLabel}
        />
      </StyledDataSourceSelector>
    );
  }
);

DataSourceSelector.displayName = 'DataSourceSelector';

export default DataSourceSelector;
