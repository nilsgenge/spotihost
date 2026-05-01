import { Link } from "react-router-dom";
import styles from "./Breadcrumbs.module.scss";

interface BreadcrumbProps {
  item1: {
    name: string;
    type: string;
    spotify_id: string | undefined;
  };
  item2?: string;
}

export const TrackBreadcrumb = ({ item1, item2 }: BreadcrumbProps) => {
  return (
    <nav aria-label="breadcrumb" className={styles.breadcrumbNav}>
      <ol className="breadcrumb mb-3">
        <li className="breadcrumb-item">
          <Link to="/dashboard" className="text-soft hover-underline">
            Dashboard
          </Link>
        </li>

        {item2 ? (
          <li className="breadcrumb-item">
            <Link
              to={`/${item1.type}/${item1.spotify_id}`}
              className="text-soft hover-underline"
            >
              {item1.name}
            </Link>
          </li>
        ) : (
          <li className="breadcrumb-item text-soft" aria-current="page">
            {item1.name}
          </li>
        )}

        {item2 && (
          <li className="breadcrumb-item text-soft" aria-current="page">
            {item2}
          </li>
        )}
      </ol>
    </nav>
  );
};
