import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Search, CheckCircle, XCircle, Eye, FileText } from "lucide-react";
import { formatDate } from "@/utils/date";
import { Logger } from "@/utils/logger";

interface CharityDocument {
  id: string;
  charity_id: string;
  document_type: "tax_certificate" | "registration" | "annual_report";
  document_url: string;
  verified: boolean;
  uploaded_at: string;
  verified_at: string | null;
  charity?: {
    id: string;
    user_id: string;
    type: string;
    charity_details?: {
      name: string;
    };
  };
}

/**
 * Returns a human-readable label for a document type.
 * @param type - The document type key.
 * @returns The formatted document type label.
 */
const getDocumentTypeLabel = (type: string): string => {
  switch (type) {
    case "tax_certificate":
      return "Tax Certificate";
    case "registration":
      return "Registration Document";
    case "annual_report":
      return "Annual Report";
    default:
      return type.charAt(0).toUpperCase() + type.slice(1).replace("_", " ");
  }
};

/* ------------------------------------------------------------------ */
/*  DocumentInfoColumn                                                 */
/* ------------------------------------------------------------------ */

interface DocumentInfoColumnProps {
  document: CharityDocument;
}

/**
 * Displays detailed information about a document.
 * @param document - The charity document to display details for.
 * @returns A React element showing document information.
 */
const DocumentInfoColumn: React.FC<DocumentInfoColumnProps> = ({
  document,
}) => (
  <div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">
      Document Information
    </h3>
    <div className="space-y-3">
      <div>
        <p className="text-sm text-gray-500">Document Type</p>
        <p className="font-medium">
          {getDocumentTypeLabel(document.document_type)}
        </p>
      </div>
      <div>
        <p className="text-sm text-gray-500">Uploaded At</p>
        <p className="font-medium">{formatDate(document.uploaded_at, true)}</p>
      </div>
      <div>
        <p className="text-sm text-gray-500">Status</p>
        <span
          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
            document.verified
              ? "bg-green-100 text-green-800"
              : "bg-yellow-100 text-yellow-800"
          }`}
        >
          {document.verified ? "Verified" : "Pending"}
        </span>
      </div>
      {document.verified_at && (
        <div>
          <p className="text-sm text-gray-500">Verified At</p>
          <p className="font-medium">
            {formatDate(document.verified_at, true)}
          </p>
        </div>
      )}
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/*  CharityInfoColumn                                                  */
/* ------------------------------------------------------------------ */

interface CharityInfoColumnProps {
  document: CharityDocument;
}

/**
 * Displays basic charity information associated with a document.
 * @param document - The charity document containing charity details.
 * @returns A React element showing charity information.
 */
const CharityInfoColumn: React.FC<CharityInfoColumnProps> = ({ document }) => (
  <div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">
      Charity Information
    </h3>
    <div className="space-y-3">
      <div>
        <p className="text-sm text-gray-500">Charity Name</p>
        <p className="font-medium">
          {document.charity?.charity_details?.name || "Unknown Charity"}
        </p>
      </div>
      <div>
        <p className="text-sm text-gray-500">Charity ID</p>
        <p className="font-mono text-sm">{document.charity_id}</p>
      </div>
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/*  DocumentPreview                                                    */
/* ------------------------------------------------------------------ */

interface DocumentPreviewProps {
  documentUrl: string;
}

/**
 * Displays the content of a document preview including URL and view button.
 * @param documentUrl - The URL of the document to preview.
 * @returns A React element showing the document preview content.
 */
const DocumentPreviewContent: React.FC<DocumentPreviewProps> = ({
  documentUrl,
}) => (
  <div className="flex items-center justify-center p-4 bg-white border border-gray-200 rounded">
    <div className="text-center">
      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />
      <p className="text-sm text-gray-500 mb-2">Document URL:</p>
      <p className="text-sm font-mono text-gray-900 break-all mb-4">
        {documentUrl}
      </p>
      <a
        href={documentUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
      >
        View Document
      </a>
    </div>
  </div>
);

/**
 * Wraps the document preview content in a styled container.
 * @param documentUrl - The URL of the document to preview.
 * @returns A React element with preview section.
 */
const DocumentPreview: React.FC<DocumentPreviewProps> = ({ documentUrl }) => (
  <div className="border p-4 rounded-lg bg-gray-50">
    <h3 className="text-lg font-medium text-gray-900 mb-2">Document Preview</h3>
    <DocumentPreviewContent documentUrl={documentUrl} />
  </div>
);

/* ------------------------------------------------------------------ */
/*  DocumentViewModal                                                  */
/* ------------------------------------------------------------------ */

interface DocumentViewModalProps {
  document: CharityDocument;
  onClose: () => void;
  onVerify: (document: CharityDocument) => void;
  onReject: (document: CharityDocument) => void;
}

/**
 * Renders the header section of the document view modal.
 * @param onClose - Callback to close the modal.
 * @returns A React element for modal header.
 */
const DocumentViewModalHeader: React.FC<{ onClose: () => void }> = ({
  onClose,
}) => (
  <div className="p-6 border-b border-gray-200">
    <div className="flex justify-between items-center">
      <h2 className="text-xl font-semibold text-gray-900">Document Details</h2>
      <Button variant="ghost" size="sm" onClick={onClose}>
        <XCircle className="h-5 w-5" />
      </Button>
    </div>
  </div>
);

/**
 * Renders the footer section of the document view modal with action buttons.
 * @param document - The charity document to act upon.
 * @param onClose - Callback to close the modal.
 * @param onVerify - Callback to verify the document.
 * @param onReject - Callback to reject the document.
 * @returns A React element for modal footer.
 */
const DocumentViewModalFooter: React.FC<DocumentViewModalProps> = ({
  document,
  onClose,
  onVerify,
  onReject,
}) => (
  <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
    <Button onClick={onClose}>Close</Button>
    {!document.verified && (
      <>
        <Button
          variant="secondary"
          onClick={() => {
            onClose();
            onVerify(document);
          }}
        >
          Verify
        </Button>
        <Button
          variant="danger"
          onClick={() => {
            onClose();
            onReject(document);
          }}
        >
          Reject
        </Button>
      </>
    )}
  </div>
);

/**
 * Renders the body of the document view modal, showing info and preview.
 * @param document - The charity document to display.
 * @returns A React element for modal body.
 */
const DocumentViewModalBody: React.FC<{ document: CharityDocument }> = ({
  document,
}) => (
  <div className="p-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      <DocumentInfoColumn document={document} />
      <CharityInfoColumn document={document} />
    </div>
    <DocumentPreview documentUrl={document.document_url} />
  </div>
);

/**
 * Renders the document view modal with header, body, and footer.
 * @param document - The charity document to view.
 * @param onClose - Callback to close the modal.
 * @param onVerify - Callback to verify the document.
 * @param onReject - Callback to reject the document.
 * @returns A React element for the full modal.
 */
const DocumentViewModal: React.FC<DocumentViewModalProps> = (props) => {
  const { document, onClose, onVerify, onReject } = props;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        <DocumentViewModalHeader onClose={onClose} />
        <DocumentViewModalBody document={document} />
        <DocumentViewModalFooter
          document={document}
          onClose={onClose}
          onVerify={onVerify}
          onReject={onReject}
        />
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  VerifyConfirmModal                                                 */
/* ------------------------------------------------------------------ */

interface VerifyConfirmModalProps {
  document: CharityDocument;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/**
 * Renders the content for confirm verification modal.
 * @param document - The charity document to verify.
 * @param loading - Whether the confirm action is processing.
 * @param onClose - Callback to close the modal.
 * @param onConfirm - Callback to confirm verification.
 * @returns A React element for confirm verification content.
 */
const VerifyConfirmModalContent: React.FC<VerifyConfirmModalProps> = ({
  document,
  loading,
  onClose,
  onConfirm,
}) => (
  <div className="p-6">
    <div className="bg-green-100 rounded-full p-3 mx-auto mb-4 w-fit">
      <CheckCircle className="h-6 w-6 text-green-600" />
    </div>
    <h3 className="text-lg font-medium text-gray-900 text-center mb-2">
      Confirm Verification
    </h3>
    <p className="text-sm text-gray-500 text-center mb-6">
      Are you sure you want to verify the{" "}
      {getDocumentTypeLabel(document.document_type)} for{" "}
      <span className="font-semibold">
        {document.charity?.charity_details?.name || "Unknown Charity"}
      </span>
      ?
    </p>
    <div className="flex justify-center space-x-3">
      <Button variant="secondary" onClick={onClose}>
        Cancel
      </Button>
      <Button onClick={onConfirm} disabled={loading}>
        {loading ? "Processing..." : "Verify Document"}
      </Button>
    </div>
  </div>
);

/**
 * Renders the verify confirmation modal.
 * @param document - The charity document to verify.
 * @param loading - Whether the confirm action is processing.
 * @param onClose - Callback to close the modal.
 * @param onConfirm - Callback to confirm verification.
 * @returns A React element for the modal.
 */
const VerifyConfirmModal: React.FC<VerifyConfirmModalProps> = ({
  document,
  loading,
  onClose,
  onConfirm,
}) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
      <VerifyConfirmModalContent
        document={document}
        loading={loading}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/*  RejectConfirmModal                                                 */
/* ------------------------------------------------------------------ */

interface RejectConfirmModalProps {
  document: CharityDocument;
  loading: boolean;
  rejectReason: string;
  onRejectReasonChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

interface RejectReasonFieldProps {
  rejectReason: string;
  onRejectReasonChange: (value: string) => void;
}

/**
 * Renders a textarea field for entering rejection reason.
 * @param rejectReason - Current rejection reason text.
 * @param onRejectReasonChange - Callback when reason changes.
 * @returns A React element for rejection reason input.
 */
const RejectReasonField: React.FC<RejectReasonFieldProps> = ({
  rejectReason,
  onRejectReasonChange,
}) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-1">
      Reason for Rejection (Optional)
    </label>
    <textarea
      value={rejectReason}
      onChange={(e) => onRejectReasonChange(e.target.value)}
      rows={3}
      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
      placeholder="Enter reason for rejection..."
    />
  </div>
);

/**
 * Renders the content for confirm rejection modal, including reason field.
 * @param document - The charity document to reject.
 * @param loading - Whether the reject action is processing.
 * @param rejectReason - The reason entered for rejection.
 * @param onRejectReasonChange - Callback when reason changes.
 * @param onClose - Callback to close the modal.
 * @param onConfirm - Callback to confirm rejection.
 * @returns A React element for confirm rejection content.
 */
const RejectConfirmModalContent: React.FC<RejectConfirmModalProps> = ({
  document,
  loading,
  rejectReason,
  onRejectReasonChange,
  onClose,
  onConfirm,
}) => (
  <div className="p-6">
    <div className="bg-red-100 rounded-full p-3 mx-auto mb-4 w-fit">
      <XCircle className="h-6 w-6 text-red-600" />
    </div>
    <h3 className="text-lg font-medium text-gray-900 text-center mb-2">
      Confirm Rejection
    </h3>
    <p className="text-sm text-gray-500 text-center mb-4">
      Are you sure you want to reject the{" "}
      {getDocumentTypeLabel(document.document_type)} for{" "}
      <span className="font-semibold">
        {document.charity?.charity_details?.name || "Unknown Charity"}
      </span>
      ?
    </p>
    <RejectReasonField
      rejectReason={rejectReason}
      onRejectReasonChange={onRejectReasonChange}
    />
    <div className="flex justify-center space-x-3">
      <Button variant="secondary" onClick={onClose}>
        Cancel
      </Button>
      <Button variant="danger" onClick={onConfirm} disabled={loading}>
        {loading ? "Processing..." : "Reject Document"}
      </Button>
    </div>
  </div>
);

/**
 * Renders the reject confirmation modal.
 * @param props - Props including document, loading, reason, and callbacks.
 * @returns A React element for the modal.
 */
const RejectConfirmModal: React.FC<RejectConfirmModalProps> = (props) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
      <RejectConfirmModalContent {...props} />
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/*  DocumentsTableCard                                                 */
/* ------------------------------------------------------------------ */

interface DocumentsTableCardProps {
  documents: CharityDocument[];
  onView: (document: CharityDocument) => void;
  onVerify: (document: CharityDocument) => void;
  onReject: (document: CharityDocument) => void;
}

interface DocumentRowProps {
  document: CharityDocument;
  onView: (document: CharityDocument) => void;
  onVerify: (document: CharityDocument) => void;
  onReject: (document: CharityDocument) => void;
}

/**
 * Displays a badge indicating document verification status.
 * @param verified - Whether the document is verified.
 * @returns A React element for status badge.
 */
const DocumentStatusBadge: React.FC<{ verified: boolean }> = ({ verified }) => (
  <span
    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
      verified ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
    }`}
  >
    {verified ? "Verified" : "Pending"}
  </span>
);

/**
 * Renders action buttons for a document row (view, verify, reject).
 * @param document - The charity document.
 * @param onView - Callback to view document.
 * @param onVerify - Callback to verify document.
 * @param onReject - Callback to reject document.
 * @returns A React element for action buttons.
 */
const DocumentActions: React.FC<DocumentRowProps> = ({
  document,
  onView,
  onVerify,
  onReject,
}) => (
  <div className="flex justify-end space-x-2">
    <Button
      variant="ghost"
      size="sm"
      onClick={() => onView(document)}
      className="text-indigo-600 hover:text-indigo-900"
    >
      <Eye className="h-4 w-4" />
    </Button>
    {!document.verified && (
      <>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onVerify(document)}
          className="text-green-600 hover:text-green-900"
        >
          <CheckCircle className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onReject(document)}
          className="text-red-600 hover:text-red-900"
        >
          <XCircle className="h-4 w-4" />
        </Button>
      </>
    )}
  </div>
);

/**
 * Renders a table row for a single document.
 * @param document - The charity document.
 * @param onView - Callback to view document.
 * @param onVerify - Callback to verify document.
 * @param onReject - Callback to reject document.
 * @returns A React element for the table row.
 */
const DocumentRow: React.FC<DocumentRowProps> = ({
  document,
  onView,
  onVerify,
  onReject,
}) => (
  <tr>
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="text-sm text-gray-900">
        {document.charity?.charity_details?.name || "Unknown Charity"}
      </div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="text-sm text-gray-900">
        {getDocumentTypeLabel(document.document_type)}
      </div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="text-sm text-gray-900">
        {formatDate(document.uploaded_at)}
      </div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      <DocumentStatusBadge verified={document.verified} />
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
      <DocumentActions
        document={document}
        onView={onView}
        onVerify={onVerify}
        onReject={onReject}
      />
    </td>
  </tr>
);

/**
 * Renders the header section for documents table.
 * @returns A React element for the table header.
 */
const DocumentsTableHeader: React.FC = () => (
  <thead className="bg-gray-50">
    <tr>
      <th
        scope="col"
        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
      >
        Charity
      </th>
      <th
        scope="col"
        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
      >
        Document Type
      </th>
      <th
        scope="col"
        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
      >
        Uploaded
      </th>
      <th
        scope="col"
        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
      >
        Status
      </th>
      <th
        scope="col"
        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
      >
        Actions
      </th>
    </tr>
  </thead>
);

/**
 * Renders the documents table with rows for each document.
 * @param documents - Array of charity documents.
 * @param onView - Callback to view a document.
 * @param onVerify - Callback to verify a document.
 * @param onReject - Callback to reject a document.
 * @returns A React element for the documents table.
 */
const DocumentsTable: React.FC<DocumentsTableCardProps> = ({
  documents,
  onView,
  onVerify,
  onReject,
}) => (
  <table className="min-w-full divide-y divide-gray-200">
    <DocumentsTableHeader />
    <tbody className="bg-white divide-y divide-gray-200">
      {documents.map((document) => (
        <DocumentRow
          key={document.id}
          document={document}
          onView={onView}
          onVerify={onVerify}
          onReject={onReject}
        />
      ))}
    </tbody>
  </table>
);

/**
 * Wraps the documents table in a card container.
 * @param documents - Array of charity documents.
 * @param onView - Callback to view a document.
 * @param onVerify - Callback to verify a document.
 * @param onReject - Callback to reject a document.
 * @returns A React element for the table card.
 */
const DocumentsTableCard: React.FC<DocumentsTableCardProps> = ({
  documents,
  onView,
  onVerify,
  onReject,
}) => (
  <Card>
    <div className="overflow-x-auto">
      <DocumentsTable
        documents={documents}
        onView={onView}
        onVerify={onVerify}
        onReject={onReject}
      />
    </div>
  </Card>
);

/* ------------------------------------------------------------------ */
/*  AdminVerifications (main component)                                */
/* ------------------------------------------------------------------ */

/**
 * Main component for admin verifications. Fetches and displays documents,
 * and handles view, verify, and reject actions.
 * @returns A React element for the admin verifications page.
 */
const AdminVerifications: React.FC = () => {
  const [documents, setDocuments] = useState<CharityDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDocument, setSelectedDocument] =
    useState<CharityDocument | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  /**
   * Fetches documents from the server and updates state.
   * @returns Promise<void>
   */
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("charity_documents")
        .select(
          `
          *,
          charity:charity_id (
            id,
            user_id,
            type,
            charity_details:charity_details (
              name
            )
          )
        `,
        )
        .order("uploaded_at", { ascending: false });

      if (fetchError) throw fetchError;

      setDocuments(data || []);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch documents";
      setError(message);
      Logger.error("Admin documents fetch error", { error: err });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  /**
   * Handles search input changes.
   * @param e - Change event from search input.
   */
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const filteredDocuments = documents.filter((document) => {
    const charityName = document.charity?.charity_details?.name || "";
    const documentType = document.document_type || "";
    const documentId = document.id || "";
    const charityId = document.charity_id || "";

    return (
      charityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      documentType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      documentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      charityId.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  /**
   * Opens the view modal for a selected document.
   * @param document - The charity document to view.
   */
  const handleView = (document: CharityDocument) => {
    setSelectedDocument(document);
    setIsViewModalOpen(true);
  };

  /**
   * Opens the verify confirmation modal for a document.
   * @param document - The charity document to verify.
   */
  const handleVerify = (document: CharityDocument) => {
    setSelectedDocument(document);
    setIsVerifyModalOpen(true);
  };

  /**
   * Opens the reject confirmation modal for a document.
   * @param document - The charity document to reject.
   */
  const handleReject = (document: CharityDocument) => {
    setSelectedDocument(document);
    setRejectReason("");
    setIsRejectModalOpen(true);
  };

  /**
   * Confirms verification of the selected document and refreshes list.
   * @returns Promise<void>
   */
  const confirmVerify = async () => {
    if (!selectedDocument) return;

    try {
      setLoading(true);

      const { error: updateError } = await supabase
        .from("charity_documents")
        .update({
          verified: true,
          verified_at: new Date().toISOString(),
        })
        .eq("id", selectedDocument.id);

      if (updateError) throw updateError;

      setIsVerifyModalOpen(false);
      setSelectedDocument(null);

      // Refresh the list
      await fetchDocuments();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to verify document";
      setError(message);
      Logger.error("Admin document verify error", { error: err });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Confirms rejection of the selected document and refreshes list.
   * @returns Promise<void>
   */
  const confirmReject = async () => {
    if (!selectedDocument) return;

    try {
      setLoading(true);

      // In a real implementation, you might want to store the rejection reason
      // For now, we'll just delete the document
      const { error: deleteError } = await supabase
        .from("charity_documents")
        .delete()
        .eq("id", selectedDocument.id);

      if (deleteError) throw deleteError;

      setIsRejectModalOpen(false);
      setSelectedDocument(null);
      setRejectReason("");

      // Refresh the list
      await fetchDocuments();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to reject document";
      setError(message);
      Logger.error("Admin document reject error", { error: err });
    } finally {
      setLoading(false);
    }
  };

  if (loading && documents.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Charity Verifications
        </h1>
        <Button onClick={fetchDocuments} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <Card className="mb-6">
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search documents..."
              value={searchTerm}
              onChange={handleSearch}
              className="pl-10"
            />
          </div>
        </div>
      </Card>

      <DocumentsTableCard
        documents={filteredDocuments}
        onView={handleView}
        onVerify={handleVerify}
        onReject={handleReject}
      />

      {isViewModalOpen && selectedDocument && (
        <DocumentViewModal
          document={selectedDocument}
          onClose={() => setIsViewModalOpen(false)}
          onVerify={handleVerify}
          onReject={handleReject}
        />
      )}

      {isVerifyModalOpen && selectedDocument && (
        <VerifyConfirmModal
          document={selectedDocument}
          loading={loading}
          onClose={() => setIsVerifyModalOpen(false)}
          onConfirm={confirmVerify}
        />
      )}

      {isRejectModalOpen && selectedDocument && (
        <RejectConfirmModal
          document={selectedDocument}
          loading={loading}
          rejectReason={rejectReason}
          onRejectReasonChange={setRejectReason}
          onClose={() => setIsRejectModalOpen(false)}
          onConfirm={confirmReject}
        />
      )}
    </div>
  );
};

export default AdminVerifications;
