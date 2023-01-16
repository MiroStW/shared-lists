import "material-icons/iconfont/filled.css";
import "material-icons/iconfont/outlined.css";

const Icon = ({
  iconName,
  style = "filled",
  size = 18,
}: {
  iconName: string;
  style?: "filled" | "outlined";
  size?: 18 | 20 | 24 | 36 | 48;
}) => {
  return (
    <span
      className={`material-icons${
        style === "outlined" ? "-outlined" : ""
      } md-${size}`}
    >
      {iconName}
    </span>
  );
};

export { Icon };
