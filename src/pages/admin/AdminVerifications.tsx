import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  Search,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  FileText,
} from "lucide-react";
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

  useEffect(() => {
    fetchDocuments();
  }, []);

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

  const handleView = (document: CharityDocument) => {
    setSelectedDocument(document);
    setIsViewModalOpen(true);
  };

  const handleVerify = (document: CharityDocument) => {
    setSelectedDocument(document);
    setIsVerifyModalOpen(true);
  };

  const handleReject = (document: CharityDocument) => {
    setSelectedDocument(document);
    setRejectReason("");
    setIsRejectModalOpen(true);
  };

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

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
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
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDocuments.map((document) => (
                <tr key={document.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {document.charity?.charity_details?.name ||
                        "Unknown Charity"}
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
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        document.verified
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {document.verified ? "Verified" : "Pending"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleView(document)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {!document.verified && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleVerify(document)}
                            className="text-green-600 hover:text-green-900"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReject(document)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* View Modal */}
      {isViewModalOpen && selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">
                  Document Details
                </h2>
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
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Document Information
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500">Document Type</p>
                      <p className="font-medium">
                        {getDocumentTypeLabel(selectedDocument.document_type)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Uploaded At</p>
                      <p className="font-medium">
                        {formatDate(selectedDocument.uploaded_at, true)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          selectedDocument.verified
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {selectedDocument.verified ? "Verified" : "Pending"}
                      </span>
                    </div>
                    {selectedDocument.verified_at && (
                      <div>
                        <p className="text-sm text-gray-500">Verified At</p>
                        <p className="font-medium">
                          {formatDate(selectedDocument.verified_at, true)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Charity Information
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500">Charity Name</p>
                      <p className="font-medium">
                        {selectedDocument.charity?.charity_details?.name ||
                          "Unknown Charity"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Charity ID</p>
                      <p className="font-mono text-sm">
                        {selectedDocument.charity_id}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border p-4 rounded-lg bg-gray-50">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Document Preview
                </h3>
                <div className="flex items-center justify-center p-4 bg-white border border-gray-200 rounded">
                  <div className="text-center">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 mb-2">Document URL:</p>
                    <p className="text-sm font-mono text-gray-900 break-all mb-4">
                      {selectedDocument.document_url}
                    </p>
                    <a
                      href={selectedDocument.document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      View Document
                    </a>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <Button onClick={() => setIsViewModalOpen(false)}>Close</Button>
              {!selectedDocument.verified && (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setIsViewModalOpen(false);
                      handleVerify(selectedDocument);
                    }}
                  >
                    Verify
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => {
                      setIsViewModalOpen(false);
                      handleReject(selectedDocument);
                    }}
                  >
                    Reject
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Verify Confirmation Modal */}
      {isVerifyModalOpen && selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center mb-4">
                <div className="bg-green-100 rounded-full p-3">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <h3 className="text-lg font-medium text-gray-900 text-center mb-2">
                Confirm Verification
              </h3>
              <p className="text-sm text-gray-500 text-center mb-6">
                Are you sure you want to verify the{" "}
                {getDocumentTypeLabel(selectedDocument.document_type)} for{" "}
                <span className="font-semibold">
                  {selectedDocument.charity?.charity_details?.name ||
                    "Unknown Charity"}
                </span>
                ?
              </p>
              <div className="flex justify-center space-x-3">
                <Button
                  variant="secondary"
                  onClick={() => setIsVerifyModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={confirmVerify} disabled={loading}>
                  {loading ? "Processing..." : "Verify Document"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Confirmation Modal */}
      {isRejectModalOpen && selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center mb-4">
                <div className="bg-red-100 rounded-full p-3">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
              </div>
              <h3 className="text-lg font-medium text-gray-900 text-center mb-2">
                Confirm Rejection
              </h3>
              <p className="text-sm text-gray-500 text-center mb-4">
                Are you sure you want to reject the{" "}
                {getDocumentTypeLabel(selectedDocument.document_type)} for{" "}
                <span className="font-semibold">
                  {selectedDocument.charity?.charity_details?.name ||
                    "Unknown Charity"}
                </span>
                ?
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for Rejection (Optional)
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="Enter reason for rejection..."
                />
              </div>
              <div className="flex justify-center space-x-3">
                <Button
                  variant="secondary"
                  onClick={() => setIsRejectModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={confirmReject}
                  disabled={loading}
                >
                  {loading ? "Processing..." : "Reject Document"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminVerifications;
