import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, RefreshCw, AlertCircle, Search, Filter, CheckCircle } from 'lucide-react';
import { errorLogApi } from '@/services/api/errorLogApi';
import { ErrorLog, ErrorLogsFilter } from '@/types/errorLog';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const ErrorLogsPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { token } = useAuth();
  
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<ErrorLogsFilter>({
    page: 1,
    pageSize: 20,
    resolved: false,
    search: ''
  });
  const [totalItems, setTotalItems] = useState(0);
  const [summary, setSummary] = useState<{ resolved: number; unresolved: number }>({ resolved: 0, unresolved: 0 });

  const fetchErrorLogs = async () => {
    try {
      setLoading(true);
      const result = await errorLogApi.getErrorLogs(filter, token);
      setErrorLogs(result.items);
      setTotalItems(result.total);
    } catch (error) {
      console.error('Error fetching error logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load error logs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const result = await errorLogApi.getErrorLogsSummary(token);
      setSummary(result);
    } catch (error) {
      console.error('Error fetching error logs summary:', error);
    }
  };

  useEffect(() => {
    if (token) {
      fetchErrorLogs();
      fetchSummary();
    }
  }, [filter.page, filter.pageSize, filter.resolved, token]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchErrorLogs();
    fetchSummary();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchErrorLogs();
  };

  const handleResolveFilterChange = (value: string) => {
    setFilter(prev => ({
      ...prev,
      resolved: value === 'all' ? undefined : value === 'resolved',
      page: 1 // Reset to first page when changing filters
    }));
  };

  const truncate = (str: string, length: number) => {
    if (!str) return '';
    return str.length > length ? str.substring(0, length) + '...' : str;
  };

  const getStatusBadge = (resolved: boolean) => (
    <Badge 
      variant={resolved ? 'default' : 'destructive'} 
      className={cn(
        'whitespace-nowrap',
        resolved && 'bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-900'
      )}
    >
      {resolved ? 'Resolved' : 'Unresolved'}
    </Badge>
  );

  const getMethodBadge = (method: string) => {
    const methodColors: Record<string, string> = {
      GET: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      POST: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      PUT: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      DELETE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      PATCH: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    };

    return (
      <span className={`text-xs font-medium px-2.5 py-0.5 rounded ${methodColors[method] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
        {method}
      </span>
    );
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Error Logs</h1>
          <p className="text-muted-foreground">View and manage application errors</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Errors</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.resolved + summary.unresolved}</div>
            <p className="text-xs text-muted-foreground">
              {summary.unresolved} unresolved • {summary.resolved} resolved
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unresolved</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {summary.unresolved}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.unresolved === 0 ? 'No unresolved errors' : 'Needs attention'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {summary.resolved}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.resolved === 0 ? 'No resolved errors' : 'Successfully handled'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current View</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{errorLogs.length}</div>
            <p className="text-xs text-muted-foreground">
              Page {filter.page} of {Math.ceil(totalItems / filter.pageSize)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <CardTitle>Error Logs</CardTitle>
            <p className="text-sm text-muted-foreground">
              Showing {errorLogs.length} of {totalItems} total errors
            </p>
          </div>
          
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search errors..."
                className="pl-8 w-full"
                value={filter.search || ''}
                onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Select
                value={filter.resolved === undefined ? 'all' : filter.resolved ? 'resolved' : 'unresolved'}
                onValueChange={handleResolveFilterChange}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="unresolved">Unresolved</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" disabled={loading}>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
          </form>
        </CardHeader>
        
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : errorLogs.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium">No errors found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {filter.search || filter.resolved !== undefined 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'No errors have been logged yet.'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Error Message</TableHead>
                    <TableHead>Endpoint</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {errorLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium max-w-[300px] truncate">
                        {truncate(log.error_message, 60)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {log.endpoint}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(log.resolved)}
                      </TableCell>
                      <TableCell>
                        {getMethodBadge(log.method)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => navigate(`/admin/error-logs/${log.id}`)}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        
        {!loading && totalItems > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <div className="text-sm text-muted-foreground">
              Showing <span className="font-medium">{(filter.page - 1) * filter.pageSize + 1}</span> to{' '}
              <span className="font-medium">
                {Math.min(filter.page * filter.pageSize, totalItems)}
              </span>{' '}
              of <span className="font-medium">{totalItems}</span> errors
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilter(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                disabled={filter.page === 1 || loading}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilter(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={filter.page * filter.pageSize >= totalItems || loading}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ErrorLogsPage;
