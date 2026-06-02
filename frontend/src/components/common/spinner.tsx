import React, { useEffect } from "react";

interface SpinnerProps {
  loading: boolean;
}
const LoadingSpinner: React.FC<SpinnerProps> = ({ loading }) => {
  useEffect(() => {
    if (loading) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  }, [loading]);

  if (!loading) {
    return;
  }
  return (
    <div className="flex justify-center items-center bg-gray-700/30 absolute top-0 left-0 w-full h-full z-50 overflow-hidden">
      <div className="rounded-md h-12 w-12 border-4 border-t-4 border-blue-500 animate-spin absolute"></div>{" "}
      {/* <div className="w-16 h-16 border-4 border-gray-200 border-t-blue-500 rounded-full animate-pulse"></div> */}
    </div>
  );
};

export default LoadingSpinner;
