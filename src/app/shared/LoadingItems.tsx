import loadingStyles from "./loadingItems.module.css";

const LoadingItems = () => {
  return (
    <>
      <div className={loadingStyles.listTitle}></div>

      {[...Array(10)].map((_, i) => (
        <div
          className={`${loadingStyles.item} ${loadingStyles.animatePulse}`}
          style={{ animationDelay: `${i * 0.1}s` }}
          key={`loadingItem-${i}`}
        >
          <div className={loadingStyles.checkbox}>
            <input type="checkbox" name="completed" id="checkbox-1" />
            <label className="material-icons" htmlFor="checkbox-1">
              x
            </label>
          </div>

          <div className={loadingStyles.itemName}></div>
        </div>
      ))}
    </>
  );
};

export default LoadingItems;
