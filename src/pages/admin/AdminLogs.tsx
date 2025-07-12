import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Search, AlertTriangle, Eye, Download, Trash, Filter, Calendar } from 'lucide-react';
import { formatDate } from '@/utils/date';
import { Logger } from '@/utils/logger';

interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  table_name: string;
  record_id: string;
  old_data: any;
  new_data: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user?: {
    email: string;
  };
}

const AdminLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [tableFilter, setTableFilter] = useState<string>('all');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('audit_logs')
        .select(`
          *,
          user:user_id (
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (fetchError) throw fetchError;

      setLogs(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch audit logs';
      setError(message);
      Logger.error('Admin logs fetch error', { error: err });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const getDateRange = () => {
    const now = new Date();
    switch (dateFilter) {
      case 'today':
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return { start: today };
      case 'week':
        const week = new Date(now);
        week.setDate(now.getDate() - 7);
        return { start: week };
      case 'month':
        const month = new Date(now);
        month.setMonth(now.getMonth() - 1);
        return { start: month };
      default:
        return null;
    }
  };

  const filteredLogs = logs.filter(log => {
    // Search filter
    const searchMatch = 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.table_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.user?.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.ip_address || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    // Date filter
    const dateRange = getDateRange();
    const dateMatch = dateRange 
      ? new Date(log.created_at) >= dateRange.start
      : true;
    
    // Action filter
    const actionMatch = actionFilter === 'all' || log.action === actionFilter;
    
    // Table filter
    const tableMatch = tableFilter === 'all' || log.table_name === tableFilter;
    
    return searchMatch && dateMatch && actionMatch && tableMatch;
  });

  // Get unique actions and tables for filters
  const uniqueActions = Array.from(new Set(logs.map(log => log.action)));
  const uniqueTables = Array.from(new Set(logs.map(log => log.table_name)));

  const handleView = (log: AuditLog) => {
    setSelectedLog(log);
    setIsViewModalOpen(true);
  };

  const handleExport = () => {
    try {
      // Convert logs to CSV
      const headers = ['ID', 'User', 'Action', 'Table', 'Record ID', 'IP Address', 'Date'];
      const csvContent = [
        headers.join(','),
        ...filteredLogs.map(log => [
          log.id,
          log.user?.email || 'Anonymous',
          log.action,
          log.table_name,
          log.record_id,
          log.ip_address || 'Unknown',
          formatDate(log.created_at, true)
        ].join(','))
      ].join('\n');
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export logs';
      setError(message);
      Logger.error('Admin logs export error', { error: err });
    }
  };

  if (loading && logs.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <div className="flex space-x-3">
          <Button
            variant="secondary"
            onClick={handleExport}
            className="flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button
            onClick={fetchLogs}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <Card className="mb-6">
        <div className="p-4">
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={handleSearch}
                className="pl-10"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="all">All Actions</option>
                {uniqueActions.map(action => (
                  <option key={action} value={action}>{action}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={tableFilter}
                onChange={(e) => setTableFilter(e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="all">All Tables</option>
                {uniqueTables.map(table => (
                  <option key={table} value={table}>{table}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-gray-400" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as 'all' | 'today' | 'week' | 'month')}
                className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Table
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP Address
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatDate(log.created_at)}</div>
                    <div className="text-xs text-gray-500">{new Date(log.created_at).toLocaleTimeString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{log.user?.email || 'Anonymous'}</div>
                    <div className="text-xs text-gray-500 font-mono">{log.user_id ? log.user_id.substring(0, 8) + '...' : 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      log.action.includes('INSERT') 
                        ? 'bg-green-100 text-green-800' 
                        : log.action.includes('UPDATE')
                        ? 'bg-blue-100 text-blue-800'
                        : log.action.includes('DELETE')
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{log.table_name}</div>
                    <div className="text-xs text-gray-500 font-mono">{log.record_id.substring(0, 8)}...</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{log.ip_address || 'Unknown'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleView(log)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* View Modal */}
      {isViewModalOpen && selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Log Details</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsViewModalOpen(false)}
                >
                  <XCircle className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Basic Information</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500">Log ID</p>
                      <p className="font-mono text-sm">{selectedLog.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Timestamp</p>
                      <p className="font-medium">{formatDate(selectedLog.created_at, true)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">User</p>
                      <p className="font-medium">{selectedLog.user?.email || 'Anonymous'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">User ID</p>
                      <p className="font-mono text-sm">{selectedLog.user_id || 'N/A'}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Action Information</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500">Action</p>
                      <p className="font-medium">{selectedLog.action}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Table</p>
                      <p className="font-medium">{selectedLog.table_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Record ID</p>
                      <p className="font-mono text-sm">{selectedLog.record_id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">IP Address</p>
                      <p className="font-medium">{selectedLog.ip_address || 'Unknown'}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Old Data</h3>
                  <div className="bg-gray-50 p-4 rounded-md overflow-auto max-h-60">
                    <pre className="text-xs font-mono text-gray-800">
                      {selectedLog.old_data ? JSON.stringify(selectedLog.old_data, null, 2) : 'No data'}
                    </pre>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">New Data</h3>
                  <div className="bg-gray-50 p-4 rounded-md overflow-auto max-h-60">
                    <pre className="text-xs font-mono text-gray-800">
                      {selectedLog.new_data ? JSON.stringify(selectedLog.new_data, null, 2) : 'No data'}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <Button
                onClick={() => setIsViewModalOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLogs;