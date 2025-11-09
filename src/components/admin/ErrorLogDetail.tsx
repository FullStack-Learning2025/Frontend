import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, AlertCircle, CheckCircle, ArrowLeft, Copy, Check, Trash2 } from 'lucide-react';
import { errorLogApi } from '@/services/api/errorLogApi';
import { ErrorLog } from '@/types/errorLog';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const ErrorLogDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [errorLog, setErrorLog] = useState<ErrorLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchErrorLog = async () => {
      if (!token || !id) return;

      try {
        setLoading(true);
        const data = await errorLogApi.getErrorLogById(id, token);
        setErrorLog(data);
        setResolutionNotes(data.resolution_notes || '');
      } catch (error) {
        console.error('Error fetching error log:', error);
        toast({
          title: 'Error',
          description: 'Failed to load error log details',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchErrorLog();
  }, [id, token]);

  const handleResolve = async () => {
    if (!errorLog?.id || !token) return;
    
    try {
      setResolving(true);
      const updatedLog = await errorLogApi.markAsResolved(errorLog.id, resolutionNotes, token);
      setErrorLog(updatedLog);
      toast({
        title: 'Success',
        description: 'Error marked as resolved',
      });
    } catch (error) {
      console.error('Error resolving error log:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark error as resolved',
        variant: 'destructive',
      });
    } finally {
      setResolving(false);
    }
  };

  const handleDelete = async () => {
    if (!errorLog?.id || !token) return;

    if (!confirm('Are you sure you want to delete this error log? This action cannot be undone.')) {
      return;
    }

    try {
      await errorLogApi.deleteErrorLog(errorLog.id, token);
      toast({
        title: 'Success',
        description: 'Error log deleted successfully',
      });
      navigate('/admin/error-logs');
    } catch (error) {
      console.error('Error deleting error log:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete error log',
        variant: 'destructive',
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!errorLog) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Error log not found</AlertDescription>
      </Alert>
    );
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatJson = (jsonString: string) => {
    try {
      const obj = JSON.parse(jsonString);
      return JSON.stringify(obj, null, 2);
    } catch (e) {
      return jsonString;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to list
        </Button>
        <div className="flex items-center space-x-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
          {!errorLog.resolved && (
            <Button
              onClick={handleResolve}
              disabled={resolving}
              className="bg-green-600 hover:bg-green-700"
            >
              {resolving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Marking as Resolved...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Mark as Resolved
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold">
                {errorLog.error_message.substring(0, 100)}
                {errorLog.error_message.length > 100 && '...'}
              </CardTitle>
              <CardDescription className="mt-2">
                {errorLog.endpoint} • {formatDateTime(errorLog.created_at)}
              </CardDescription>
            </div>
            {/* <Badge variant={errorLog.resolved ? 'success' : 'destructive'}> */}
              <Badge variant={errorLog.resolved ? 'default' : 'destructive'}>
              {errorLog.resolved ? 'Resolved' : 'Unresolved'}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-medium mb-2">Error Details</h3>
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md relative">
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 h-8 w-8 p-0"
                onClick={() => copyToClipboard(errorLog.error_stack || errorLog.error_message)}
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <pre className="text-sm overflow-auto max-h-96">
                {errorLog.error_stack || errorLog.error_message}
              </pre>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-2">Request Information</h3>
              <div className="space-y-2">
                <p><span className="font-medium">Method:</span> {errorLog.method}</p>
                <p><span className="font-medium">Status:</span> {errorLog.status_code}</p>
                {/* <p><span className="font-medium">User ID:</span> {errorLog.user_id || 'N/A'}</p>
                <p><span className="font-medium">IP Address:</span> {errorLog.ip_address || 'N/A'}</p>
                <p><span className="font-medium">User Agent:</span> {errorLog.user_agent || 'N/A'}</p> */}
              </div>
            </div>

            {errorLog.request_body && (
              <div>
                <h3 className="font-medium mb-2">Request Body</h3>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 h-8 w-8 p-0"
                    onClick={() => copyToClipboard(errorLog.request_body || '')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <pre className="text-sm overflow-auto max-h-48">
                    {formatJson(errorLog.request_body)}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {errorLog.request_params && (
            <div>
              <h3 className="font-medium mb-2">Request Parameters</h3>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
                <pre className="text-sm overflow-auto max-h-48">
                  {formatJson(errorLog.request_params)}
                </pre>
              </div>
            </div>
          )}

          <div>
            <h3 className="font-medium mb-2">Resolution Notes</h3>
            <Textarea
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="Add notes about how this error was resolved..."
              className="min-h-[100px]"
              disabled={errorLog.resolved}
            />
            {!errorLog.resolved && resolutionNotes && (
              <p className="mt-2 text-sm text-muted-foreground">
                These notes will be saved when you mark this error as resolved.
              </p>
            )}
          </div>

          {errorLog.resolved && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Resolved</AlertTitle>
              <AlertDescription>
                This error was marked as resolved on {formatDateTime(errorLog.resolved_at!)}.
                {errorLog.resolution_notes && (
                  <div className="mt-2 p-3 bg-muted/50 rounded-md">
                    <p className="font-medium">Resolution Notes:</p>
                    <p className="whitespace-pre-line mt-1">{errorLog.resolution_notes}</p>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ErrorLogDetail;
