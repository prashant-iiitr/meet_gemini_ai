
import "@stream-io/video-react-sdk/dist/css/styles.css";

interface Props {
    children: React.ReactNode;
}

const Layout = ({ children }: Props) => {
    return (
        <div className="min-h-screen overflow-hidden bg-background">
     {children}
        </div>
    );
};

export default Layout;