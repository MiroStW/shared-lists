// eslint-disable-next-line import/no-unresolved
import { Auth } from "firebase-admin/auth";

const Dummy = ({ auth }: { auth: Auth }) => {
  return (
    <div>
      <h1>
        {Object.keys(auth).map((key) => (
          <p key={key}>{key}</p>
        ))}
      </h1>
    </div>
  );
};

export default Dummy;
