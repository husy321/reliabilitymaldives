"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import DocumentListTable from "@/components/business/DocumentListTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { getDocumentsAction } from "@/lib/actions/documents";
import { DocumentWithUser, DocumentCategory, GetDocumentsParams, DocumentFilters } from "../../types/document";

interface DocumentsPageState {
  documents: DocumentWithUser[];
  totalCount: number;
  page: number;
  pageSize: number;
  loading: boolean;
  error: string | null;
}

export default function DocumentsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [state, setState] = useState<DocumentsPageState>({
    documents: [],
    totalCount: 0,
    page: 1,
    pageSize: 10,
    loading: true,
    error: null,
  });

  const [filters, setFilters] = useState<DocumentFilters>({});

  const [sortConfig, setSortConfig] = useState<{
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  }>({
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  // Initialize state from URL parameters
  useEffect(() => {
    const urlPage = parseInt(searchParams.get('page') || '1');
    const urlPageSize = parseInt(searchParams.get('pageSize') || '10');
    const urlSortBy = searchParams.get('sortBy') || 'createdAt';
    const urlSortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
    
    // Parse filters from URL
    const urlFilters: DocumentFilters = {};
    const filenameSearch = searchParams.get('search');
    if (filenameSearch) urlFilters.filenameSearch = filenameSearch;
    
    const categories = searchParams.get('categories');
    if (categories) {
      urlFilters.categoryFilter = categories.split(',') as DocumentCategory[];
    }
    
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    if (dateFrom || dateTo) {
      urlFilters.uploadDateRange = {};
      if (dateFrom) urlFilters.uploadDateRange.from = new Date(dateFrom);
      if (dateTo) urlFilters.uploadDateRange.to = new Date(dateTo);
    }

    setState(prev => ({
      ...prev,
      page: urlPage,
      pageSize: urlPageSize,
    }));

    setSortConfig({
      sortBy: urlSortBy,
      sortOrder: urlSortOrder,
    });

    setFilters(urlFilters);
  }, []); // Run only on mount

  // Update URL when state changes
  const updateURL = (newPage: number, newPageSize: number, newSortConfig: typeof sortConfig, newFilters: DocumentFilters) => {
    const params = new URLSearchParams();
    
    if (newPage !== 1) params.set('page', newPage.toString());
    if (newPageSize !== 10) params.set('pageSize', newPageSize.toString());
    if (newSortConfig.sortBy !== 'createdAt') params.set('sortBy', newSortConfig.sortBy);
    if (newSortConfig.sortOrder !== 'desc') params.set('sortOrder', newSortConfig.sortOrder);
    
    if (newFilters.filenameSearch) params.set('search', newFilters.filenameSearch);
    if (newFilters.categoryFilter && newFilters.categoryFilter.length > 0) {
      params.set('categories', newFilters.categoryFilter.join(','));
    }
    if (newFilters.uploadDateRange) {
      if (newFilters.uploadDateRange.from) {
        params.set('dateFrom', newFilters.uploadDateRange.from.toISOString());
      }
      if (newFilters.uploadDateRange.to) {
        params.set('dateTo', newFilters.uploadDateRange.to.toISOString());
      }
    }

    const newURL = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(newURL, { scroll: false });
  };

  const fetchDocuments = async (params: GetDocumentsParams) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await getDocumentsAction(params);
      
      if (result.success) {
        setState(prev => ({
          ...prev,
          documents: result.data.documents,
          totalCount: result.data.totalCount,
          page: result.data.page,
          pageSize: result.data.pageSize,
          loading: false,
        }));
      } else {
        setState(prev => ({
          ...prev,
          error: result.error,
          loading: false,
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load documents',
        loading: false,
      }));
    }
  };

  useEffect(() => {
    fetchDocuments({
      page: state.page,
      pageSize: state.pageSize,
      sortBy: sortConfig.sortBy,
      sortOrder: sortConfig.sortOrder,
      filters,
    });
  }, [state.page, state.pageSize, sortConfig, filters]);

  const handlePageChange = (page: number) => {
    setState(prev => ({ ...prev, page }));
    updateURL(page, state.pageSize, sortConfig, filters);
  };

  const handlePageSizeChange = (pageSize: number) => {
    setState(prev => ({ ...prev, pageSize, page: 1 }));
    updateURL(1, pageSize, sortConfig, filters);
  };

  const handleSort = (column: string, direction: 'asc' | 'desc') => {
    const newSortConfig = { sortBy: column, sortOrder: direction };
    setSortConfig(newSortConfig);
    updateURL(state.page, state.pageSize, newSortConfig, filters);
  };

  const handleSearch = (newFilters: DocumentFilters) => {
    setFilters(newFilters);
    setState(prev => ({ ...prev, page: 1 })); // Reset to first page when searching
    updateURL(1, state.pageSize, sortConfig, newFilters);
  };

  const handleFilterChange = (newFilters: DocumentFilters) => {
    setFilters(newFilters);
    setState(prev => ({ ...prev, page: 1 })); // Reset to first page when filtering
    updateURL(1, state.pageSize, sortConfig, newFilters);
  };

  if (state.loading && state.documents.length === 0) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-4">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-10 w-48" />
            </div>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
        <p className="text-muted-foreground">
          View and manage your uploaded documents with role-based access control.
        </p>
      </div>

      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Document Library</CardTitle>
          <CardDescription>
            {state.totalCount > 0
              ? `Showing ${state.totalCount} document${state.totalCount === 1 ? '' : 's'}`
              : 'No documents found'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {state.loading && state.documents.length > 0 && (
            <div className="mb-4">
              <Skeleton className="h-8 w-full" />
            </div>
          )}
          <DocumentListTable
            documents={state.documents}
            totalCount={state.totalCount}
            page={state.page}
            pageSize={state.pageSize}
            searchFilters={filters}
            loading={state.loading}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            onSort={handleSort}
            onSearch={handleSearch}
            onFilterChange={handleFilterChange}
          />
        </CardContent>
      </Card>
    </div>
  );
}