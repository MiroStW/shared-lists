import { List as ListType } from "../../types/types";

const List = ({ list }: { list: ListType }) => {
  return (
    <div className="list">
      <div className="listTitle">{list.data.name}</div>
    </div>
  );
};

export default List;
