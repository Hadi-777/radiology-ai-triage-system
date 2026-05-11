"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type User = {
  id: string;
  username: string;
  role: "doctor" | "technician";
};

type AiResult = {
  id: string;
  label: string;
  confidence: number;
  priority: string;
  message: string;
  heatmap_path?: string;
};

type Feedback = {
  id: string;
  decision: string;
  comment: string;
  created_at: string;
};

type Study = {
  id: string;
  patient_id: string;
  image_path: string;
  original_name: string;
  status: string;
  uploaded_at: string;
  aiResults: AiResult[];
  feedbacks?: Feedback[];
};

type FilterType =
  | "all"
  | "high"
  | "needs_review"
  | "low"
  | "approved"
  | "rejected";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const getImageUrl = (path?: string) => {
  if (!path) return "";

  if (path.startsWith("http")) {
    return path;
  }

  return `${API_URL}${path}`;
};

const formatLebanonTime = (dateValue?: string) => {
  if (!dateValue) return "N/A";

  const date = new Date(dateValue);

  date.setHours(date.getHours() + 3);

  return date.toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function normalizePriority(priority?: string) {
  return (priority || "").toLowerCase().replace(/\s+/g, "_");
}

function priorityColor(priority?: string) {
  const value = normalizePriority(priority);

  if (value === "high") return "#dc2626";
  if (value === "needs_review") return "#475569";
  if (value === "medium") return "#f59e0b";
  if (value === "low") return "#16a34a";

  return "#64748b";
}

function priorityRank(priority?: string) {
  const value = normalizePriority(priority);

  if (value === "high") return 1;
  if (value === "needs_review") return 2;
  if (value === "medium") return 3;
  if (value === "low") return 4;

  return 5;
}

function heatmapColor(priority?: string) {
  const value = normalizePriority(priority);

  if (value === "high") return "rgba(220,38,38,0.72)";
  if (value === "needs_review") return "rgba(245,158,11,0.62)";
  if (value === "low") return "rgba(34,197,94,0.45)";

  return "rgba(148,163,184,0.55)";
}

function getFilterTitle(activeFilter: FilterType) {
  if (activeFilter === "high") return "🚨 Critical / High Priority";
  if (activeFilter === "needs_review") return "🟡 Needs Review";
  if (activeFilter === "low") return "🟢 Low Priority / Normal";
  if (activeFilter === "approved") return "✅ Approved Cases";
  if (activeFilter === "rejected") return "❌ Rejected Cases";

  return "📋 All Studies";
}

function getFilterDescription(activeFilter: FilterType) {
  if (activeFilter === "high") {
    return "Most dangerous cases. Doctor should review these first.";
  }

  if (activeFilter === "needs_review") {
    return "AI confidence is low. Human review is required.";
  }

  if (activeFilter === "low") {
    return "Normal or low-risk studies.";
  }

  if (activeFilter === "approved") {
    return "Studies approved by the doctor.";
  }

  if (activeFilter === "rejected") {
    return "Studies rejected after doctor review.";
  }

  return "Complete radiology worklist sorted by urgency.";
}

export default function Home() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [studies, setStudies] = useState<Study[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [feedbackText, setFeedbackText] = useState<Record<string, string>>({});
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");
  const [selectedImage, setSelectedImage] = useState<{
    src: string;
    title: string;
    priority?: string;
  } | null>(null);

  const isDoctor = user?.role === "doctor";
  const isTechnician = user?.role === "technician";

  const fetchStudies = async () => {
    const res = await fetch(`${API_URL}/studies/worklist`);
    const data = await res.json();
    setStudies(data);
  };

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (!savedUser) {
      router.push("/login");
      return;
    }

    const parsedUser = JSON.parse(savedUser);

    if (
      parsedUser.role !== "doctor" &&
      parsedUser.role !== "technician"
    ) {
      localStorage.removeItem("user");
      router.push("/login");
      return;
    }

    setUser(parsedUser);
    setCheckingAuth(false);
  }, [router]);

  useEffect(() => {
    if (!user) return;

    fetchStudies();

    const interval = setInterval(fetchStudies, 5000);

    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (isTechnician) {
      setActiveFilter("all");
    }
  }, [isTechnician]);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(""), 2500);
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    router.push("/login");
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setLoadingStep("🔍 AI scanning lung image...");

    setTimeout(() => setLoadingStep("🧠 Detecting possible abnormalities..."), 700);
    setTimeout(() => setLoadingStep("⚡ Assigning priority level..."), 1400);

    const formData = new FormData();
    formData.append("file", file);

   const uploadRes = await fetch(`${API_URL}/studies`, {
  method: "POST",
  body: formData,
});

if (!uploadRes.ok) {
  const errorText = await uploadRes.text();
  console.error("Upload failed:", errorText);
  showToast("❌ Upload failed. Check backend terminal.");
  setLoading(false);
  setLoadingStep("");
  return;
}

setFile(null);
setActiveFilter("all");
await fetchStudies();
setLoading(false);
setLoadingStep("");

showToast("✅ X-ray uploaded and analyzed successfully");
  };

  const handleDecision = async (studyId: string, status: string) => {
    if (!isDoctor) {
      showToast("⛔ Only doctors can approve or reject cases");
      return;
    }

    const comment = feedbackText[studyId];

    if (!comment || comment.trim() === "") {
      alert("Please write doctor feedback before approving or declining.");
      return;
    }

    await fetch(`${API_URL}/studies/${studyId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    await fetch(`${API_URL}/studies/${studyId}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision: status, comment }),
    });

    setFeedbackText((prev) => ({ ...prev, [studyId]: "" }));

    await fetchStudies();

    showToast(
      status === "approved"
        ? "✅ Case approved and doctor feedback saved"
        : "❌ Case rejected and doctor feedback saved"
    );
  };

  if (checkingAuth) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#eef3f8",
          fontFamily: "Arial",
        }}
      >
        Loading secure dashboard...
      </main>
    );
  }

  const sortedStudies = [...studies].sort((a, b) => {
    const priorityDiff =
      priorityRank(a.aiResults?.[0]?.priority) -
      priorityRank(b.aiResults?.[0]?.priority);

    if (priorityDiff !== 0) return priorityDiff;

    return (
      new Date(b.uploaded_at).getTime() -
      new Date(a.uploaded_at).getTime()
    );
  });

  const total = studies.length;
  const high = studies.filter(
    (s) => normalizePriority(s.aiResults?.[0]?.priority) === "high"
  ).length;
  const needsReview = studies.filter(
    (s) => normalizePriority(s.aiResults?.[0]?.priority) === "needs_review"
  ).length;
  const low = studies.filter(
    (s) => normalizePriority(s.aiResults?.[0]?.priority) === "low"
  ).length;
  const approved = studies.filter((s) => s.status === "approved").length;
  const rejected = studies.filter((s) => s.status === "rejected").length;

  const searchedStudies = sortedStudies.filter((study) => {
    const text = search.toLowerCase();

   return (
  String(study.patient_id ?? (study as any).patientId ?? '').toLowerCase().includes(text) ||
  String(study.original_name ?? (study as any).originalName ?? '').toLowerCase().includes(text) ||
  String(study.status ?? '').toLowerCase().includes(text) ||
  normalizePriority(study.aiResults?.[0]?.priority ?? '').includes(text)
);
  });

  const filteredStudies = searchedStudies.filter((study) => {
    const priority = normalizePriority(study.aiResults?.[0]?.priority);

    if (activeFilter === "all") return true;
    if (activeFilter === "approved") return study.status === "approved";
    if (activeFilter === "rejected") return study.status === "rejected";
    if (activeFilter === "high") return priority === "high";
    if (activeFilter === "needs_review") return priority === "needs_review";
    if (activeFilter === "low") return priority === "low";

    return true;
  });

  const filterButtons = [
    { key: "all" as FilterType, label: "📋 All", count: total, color: "#2563eb" },
    { key: "high" as FilterType, label: "🚨 High", count: high, color: "#dc2626" },
    { key: "needs_review" as FilterType, label: "🟡 Needs Review", count: needsReview, color: "#475569" },
    { key: "low" as FilterType, label: "🟢 Low", count: low, color: "#16a34a" },
    { key: "approved" as FilterType, label: "✅ Approved", count: approved, color: "#0f766e" },
    { key: "rejected" as FilterType, label: "❌ Rejected", count: rejected, color: "#991b1b" },
  ];

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#eef3f8",
        padding: 32,
        fontFamily: "Arial",
      }}
    >
      <style>
        {`
          @keyframes dangerPulse {
            0% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.35); }
            70% { box-shadow: 0 0 0 12px rgba(220, 38, 38, 0); }
            100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>

      {toast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            background: "#0f172a",
            color: "white",
            padding: "14px 18px",
            borderRadius: 12,
            boxShadow: "0 10px 25px rgba(15,23,42,0.25)",
            zIndex: 999,
            fontWeight: "bold",
          }}
        >
          {toast}
        </div>
      )}

      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.88)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <button
            onClick={() => setSelectedImage(null)}
            style={{
              position: "absolute",
              top: 20,
              right: 24,
              background: "rgba(255,255,255,0.12)",
              color: "white",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: 999,
              padding: "8px 14px",
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            ✕
          </button>

          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "95%",
              maxWidth: 1050,
              background: "#0f172a",
              borderRadius: 18,
              padding: 18,
              boxShadow: "0 25px 80px rgba(0,0,0,0.45)",
            }}
          >
            <div
              style={{
                color: "white",
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 12,
                alignItems: "center",
              }}
            >
              <div>
                <h2 style={{ margin: 0 }}>{selectedImage.title}</h2>
                <p style={{ margin: "4px 0 0", color: "#cbd5e1" }}>
                  Full-screen radiology viewer
                </p>
              </div>

              <span
                style={{
                  background: priorityColor(selectedImage.priority),
                  color: "white",
                  padding: "8px 14px",
                  borderRadius: 999,
                  fontWeight: "bold",
                }}
              >
                {(selectedImage.priority || "N/A").toUpperCase()}
              </span>
            </div>

            <img
              src={selectedImage.src}
              alt="Full X-ray"
              style={{
                width: "100%",
                maxHeight: "78vh",
                objectFit: "contain",
                borderRadius: 14,
                background: "#020617",
              }}
            />
          </div>
        </div>
      )}

      <section
        style={{
          marginBottom: 28,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "start",
          gap: 18,
        }}
      >
        <div>
          <h1 style={{ fontSize: 36, margin: 0 }}>
            Radiology AI Triage
          </h1>
          <p style={{ color: "#64748b", fontSize: 16 }}>
            AI-powered decision-support system for prioritizing critical X-ray cases.
          </p>
        </div>

        <div
          style={{
            background: "white",
            padding: 14,
            borderRadius: 14,
            boxShadow: "0 6px 18px rgba(15,23,42,0.08)",
            minWidth: 230,
          }}
        >
          <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>
            Logged in as
          </p>

          <h3 style={{ margin: "6px 0" }}>
            {user?.username}
          </h3>

          <span
            style={{
              display: "inline-block",
              background: isDoctor ? "#7f1d1d" : "#1d4ed8",
              color: "white",
              padding: "6px 10px",
              borderRadius: 999,
              fontWeight: "bold",
              fontSize: 13,
              marginBottom: 10,
            }}
          >
            {isDoctor ? "Doctor Dashboard" : "Technician Dashboard"}
          </span>

          <button
            onClick={handleLogout}
            style={{
              display: "block",
              marginTop: 10,
              width: "100%",
              padding: "8px 10px",
              background: "#0f172a",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Logout
          </button>
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {[
          ["Total Studies", total],
          ["High Priority", high],
          ["Needs Review", needsReview],
          ["Low Priority", low],
          ["Approved", approved],
          ["Rejected", rejected],
        ].map(([title, value]) => (
          <div
            key={title}
            style={{
              background: "white",
              padding: 18,
              borderRadius: 14,
              boxShadow: "0 6px 18px rgba(15,23,42,0.08)",
            }}
          >
            <p style={{ margin: 0, color: "#64748b" }}>{title}</p>
            <h2 style={{ margin: "8px 0 0", fontSize: 32 }}>{value}</h2>
          </div>
        ))}
      </section>

      <section
        style={{
          background: "white",
          padding: 18,
          borderRadius: 14,
          marginBottom: 24,
          boxShadow: "0 6px 18px rgba(15,23,42,0.08)",
        }}
      >
        <h2 style={{ marginTop: 0 }}>
          {isTechnician ? "Technician Upload Panel" : "Upload New X-ray"}
        </h2>

        <p style={{ color: "#64748b" }}>
          Upload an X-ray study to run AI analysis and automatic priority assignment.
        </p>

        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />

        <button
          onClick={handleUpload}
          disabled={!file || loading}
          style={{
            marginLeft: 12,
            padding: "10px 16px",
            background: !file || loading ? "#94a3b8" : "#2563eb",
            color: "white",
            border: "none",
            borderRadius: 8,
            cursor: !file || loading ? "not-allowed" : "pointer",
            fontWeight: "bold",
          }}
        >
          {loading ? "Analyzing..." : "Upload & Analyze"}
        </button>

        {loading && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginTop: 14,
              color: "#2563eb",
              fontWeight: "bold",
            }}
          >
            <div
              style={{
                width: 18,
                height: 18,
                border: "3px solid #bfdbfe",
                borderTop: "3px solid #2563eb",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
            {loadingStep}
          </div>
        )}

        {isTechnician && (
          <p style={{ marginTop: 12, color: "#64748b", fontSize: 14 }}>
            Technician access: upload and view AI results only. Doctor approval and feedback are disabled.
          </p>
        )}
      </section>

      <section
        style={{
          background: "white",
          padding: 16,
          borderRadius: 14,
          marginBottom: 24,
          boxShadow: "0 6px 18px rgba(15,23,42,0.08)",
        }}
      >
        <h2 style={{ marginTop: 0 }}>
          {isDoctor ? "Doctor View" : "Technician View"}
        </h2>

        <p style={{ color: "#64748b" }}>
          {isDoctor
            ? "Select a category to view only the relevant cases."
            : "View uploaded studies and AI analysis results."}
        </p>

        {isDoctor && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              marginBottom: 16,
            }}
          >
            {filterButtons.map((filter) => {
              const isActive = activeFilter === filter.key;

              return (
                <button
                  key={filter.key}
                  onClick={() => setActiveFilter(filter.key)}
                  style={{
                    padding: "11px 16px",
                    borderRadius: 999,
                    border: isActive
                      ? `2px solid ${filter.color}`
                      : "1px solid #cbd5e1",
                    background: isActive ? filter.color : "white",
                    color: isActive ? "white" : "#0f172a",
                    fontWeight: "bold",
                    cursor: "pointer",
                    boxShadow: isActive
                      ? "0 6px 14px rgba(15,23,42,0.18)"
                      : "none",
                  }}
                >
                  {filter.label} ({filter.count})
                </button>
              );
            })}
          </div>
        )}

        <input
          type="text"
          placeholder="Search patient, file name, status, or AI result..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 10,
            border: "1px solid #cbd5e1",
            fontSize: 15,
          }}
        />
      </section>

      <section>
        <h2>
          {isDoctor ? getFilterTitle(activeFilter) : "📋 Technician Studies"}
        </h2>

        <p style={{ color: "#64748b" }}>
          {isDoctor
            ? getFilterDescription(activeFilter)
            : "All uploaded studies with AI analysis results. Approval actions are reserved for doctors."}
        </p>

        {filteredStudies.length === 0 && (
          <div
            style={{
              background: "white",
              padding: 20,
              borderRadius: 14,
              color: "#64748b",
              boxShadow: "0 6px 18px rgba(15,23,42,0.08)",
            }}
          >
            No studies found in this category.
          </div>
        )}

        {filteredStudies.map((study) => {
          const result = study.aiResults?.[0];
          const color = priorityColor(result?.priority);
          const latestFeedbacks = study.feedbacks?.slice(-3).reverse() || [];
          const heatColor = heatmapColor(result?.priority);
          const imageSrc = getImageUrl((study as any).imagePath ?? (study as any).image_path);

          return (
            <div
              key={study.id}
              style={{
                background: "white",
                borderLeft: `9px solid ${color}`,
                borderRadius: 16,
                padding: 20,
                marginBottom: 22,
                boxShadow: "0 6px 18px rgba(15,23,42,0.08)",
                animation:
                  normalizePriority(result?.priority) === "high"
                    ? "dangerPulse 1.8s infinite"
                    : "none",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 18,
                }}
              >
                <div>
                  <h2 style={{ margin: 0 }}>{study.patient_id}</h2>
                  <p style={{ margin: "6px 0", color: "#64748b" }}>
                    {study.original_name}
                  </p>
                </div>

                <span
                  style={{
                    background: color,
                    color: "white",
                    padding: "8px 14px",
                    borderRadius: 999,
                    fontWeight: "bold",
                  }}
                >
                  {(result?.priority || "N/A").toUpperCase()}
                </span>
              </div>

              <hr
                style={{
                  border: "none",
                  borderTop: "1px solid #e5e7eb",
                  margin: "16px 0",
                }}
              />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isDoctor
                    ? "260px 1fr 280px"
                    : "260px 1fr",
                  gap: 20,
                  alignItems: "start",
                }}
              >
                <div
                  onClick={() => {
  setSelectedImage({
    src: imageSrc,
    title: `${(study as any).patientId ?? (study as any).patient_id ?? "Unknown patient"} - ${
      (study as any).originalName ?? (study as any).original_name ?? "X-ray image"
    }`,
    priority: result?.priority ?? "N/A",
  });
}}
                  
                  style={{
                    position: "relative",
                    width: 260,
                    height: 180,
                    borderRadius: 12,
                    overflow: "hidden",
                    border: "1px solid #e5e7eb",
                    background: "#111827",
                    cursor: "zoom-in",
                  }}
                >
                  <img
                    src={imageSrc}
                    alt="X-ray preview"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />

                  <div
                    style={{
                      position: "absolute",
                      left: "38%",
                      top: "28%",
                      width: 90,
                      height: 90,
                      borderRadius: "50%",
                      background: heatColor,
                      filter: "blur(18px)",
                      opacity:
                        normalizePriority(result?.priority) === "low"
                          ? 0.35
                          : 0.72,
                      mixBlendMode: "screen",
                    }}
                  />

                  <div
                    style={{
                      position: "absolute",
                      bottom: 8,
                      left: 8,
                      background: "rgba(15,23,42,0.8)",
                      color: "white",
                      padding: "4px 8px",
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: "bold",
                    }}
                  >
                    Click to view full image
                  </div>
                </div>

                <div>
                  <p>
                    <b>Status:</b> {study.status}
                  </p>
                  <p>
                    <b>AI Label:</b> {result?.label || "N/A"}
                  </p>
                  <p>
                    <b>Confidence:</b>{" "}
                    {result
                      ? Math.round(result.confidence * 100) + "%"
                      : "N/A"}
                  </p>
                  <p>
  <b>Uploaded:</b>{" "}
  {formatLebanonTime((study as any).uploadedAt ?? (study as any).uploaded_at)}
</p>

                  <div
                    style={{
                      marginTop: 14,
                      background: "#f8fafc",
                      padding: 14,
                      borderRadius: 10,
                    }}
                  >
                    <b>AI Recommendation:</b>
                    <p style={{ marginBottom: 0 }}>
                      {result?.message || "No AI message available."}
                    </p>
                  </div>

                  {latestFeedbacks.length > 0 && (
                    <div
                      style={{
                        marginTop: 12,
                        background: "#ecfeff",
                        padding: 12,
                        borderRadius: 10,
                        border: "1px solid #22d3ee",
                      }}
                    >
                      <b>Latest Doctor Feedback:</b>

                      {latestFeedbacks.map((feedback) => (
                        <div key={feedback.id} style={{ marginTop: 8 }}>
                          <p style={{ margin: 0 }}>📝 {feedback.comment}</p>
                          <p
                            style={{
                              margin: 0,
                              fontSize: 12,
                              color: "#64748b",
                            }}
                          >
                            Decision: {feedback.decision}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {isDoctor && (
                  <div>
                    <div
                      style={{
                        height: 180,
                        borderRadius: 12,
                        background: "#0f172a",
                        color: "white",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                        fontWeight: "bold",
                        marginBottom: 12,
                        border: "1px solid #334155",
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          width: 130,
                          height: 130,
                          borderRadius: "50%",
                          background: heatColor,
                          filter: "blur(20px)",
                          opacity: 0.9,
                        }}
                      />

                      <div style={{ zIndex: 2, fontSize: 18 }}>
                        AI HEATMAP
                      </div>
                      <div
                        style={{
                          zIndex: 2,
                          fontSize: 12,
                          marginTop: 8,
                          opacity: 0.85,
                        }}
                      >
                        simulated Grad-CAM area
                      </div>
                    </div>

                    <textarea
                      placeholder="Doctor feedback..."
                      value={feedbackText[study.id] || ""}
                      onChange={(e) =>
                        setFeedbackText((prev) => ({
                          ...prev,
                          [study.id]: e.target.value,
                        }))
                      }
                      style={{
                        width: "100%",
                        minHeight: 70,
                        borderRadius: 10,
                        border: "1px solid #cbd5e1",
                        padding: 10,
                        resize: "none",
                      }}
                    />

                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        marginTop: 10,
                      }}
                    >
                      <button
                        onClick={() => handleDecision(study.id, "approved")}
                        style={{
                          flex: 1,
                          padding: "10px",
                          background: "#16a34a",
                          color: "white",
                          border: "none",
                          borderRadius: 8,
                          fontWeight: "bold",
                          cursor: "pointer",
                        }}
                      >
                        Approve
                      </button>

                      <button
                        onClick={() => handleDecision(study.id, "rejected")}
                        style={{
                          flex: 1,
                          padding: "10px",
                          background: "#dc2626",
                          color: "white",
                          border: "none",
                          borderRadius: 8,
                          fontWeight: "bold",
                          cursor: "pointer",
                        }}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </section>
    </main>
  );
}

