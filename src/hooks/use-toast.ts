
import toast from "react-hot-toast";

type ToastType = "success" | "error";

export const useToast = () => {
    const showToast = (message: string, type: ToastType = "success") => {
        if (type === "success") {
            toast.success(message, {
                position: "bottom-right",
                duration: 3000,
            });
        } else {
            toast.error(message, {
                position: "bottom-right",
                duration: 3000,
            });
        }
    };

    return { showToast };
};
