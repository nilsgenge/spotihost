import Separator from "../components/ui/Separator";
import pageStyles from "../styles/page.module.scss";

const Profile = () => {
  return (
    <div className="container">
      <div className={pageStyles.pageHeader}>
        <h1>Profile</h1>
      </div>

      <Separator />
    </div>
  );
};

export default Profile;
