import { Link } from "wouter";

export default function LambdaPlaceholder() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl md:text-8xl font-light text-white tracking-widest mb-8" data-testid="text-lambda">
          Λ
        </div>
        <p className="text-gray-500 text-sm tracking-wide" data-testid="text-status">
          building
        </p>
      </div>
    </div>
  );
}
