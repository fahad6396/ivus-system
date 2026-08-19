"use client";

type ToastProps = {
  message: string;
  type?: "success" | "error" | "info";
};

export default function Toast({
  message,
  type = "success",
}: ToastProps) {
  if (!message) return null;

  const colors = {
    success: "bg-green-600",
    error: "bg-red-600",
    info: "bg-blue-600",
  };

  const icons = {
    success: "✓",
    error: "!",
    info: "i",
  };

  return (
    <div
      className={`fixed top-5 right-5 z-50 ${colors[type]} text-white px-5 py-4 rounded-xl shadow-xl flex items-center gap-3 max-w-sm`}
    >
      <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center font-bold">
        {icons[type]}
      </div>

      <span className="font-medium">{message}</span>
    </div>
  );
}