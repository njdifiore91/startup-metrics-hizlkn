import React, { useState } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import AuditLogList from '../../components/admin/AuditLogList';
import AuditLogStats from '../../components/admin/AuditLogStats';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`audit-tabpanel-${index}`}
      aria-labelledby={`audit-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `audit-tab-${index}`,
    'aria-controls': `audit-tabpanel-${index}`,
  };
}

const AuditLogs: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="Audit log tabs">
          <Tab label="Audit Logs" {...a11yProps(0)} />
          <Tab label="Statistics" {...a11yProps(1)} />
        </Tabs>
      </Box>
      <TabPanel value={tabValue} index={0}>
        <AuditLogList />
      </TabPanel>
      <TabPanel value={tabValue} index={1}>
        <AuditLogStats />
      </TabPanel>
    </Box>
  );
};

export default AuditLogs;
