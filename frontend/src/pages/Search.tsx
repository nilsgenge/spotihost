import React from "react";
import SearchBar from "../components/ui/SearchBar";
import Separator from "../components/ui/Separator";
import pageStyles from "../styles/page.module.scss";

const Search: React.FC = () => (
  <div className="container">
    <div className={pageStyles.pageHeader}>
      <h1>Search</h1>
    </div>
    <Separator />
    <div className={pageStyles.pageSection}>
      <SearchBar />
    </div>
  </div>
);

export default Search;
