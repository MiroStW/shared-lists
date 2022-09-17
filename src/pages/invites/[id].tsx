import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { Loading } from "../../components/utils/Loading";
import { Error as ErrorComp } from "../../components/utils/Error";
import { useAuth } from "../../firebase/authContext";
import { inviteConverter } from "../../firebase/firestoreConverter";
import { invites } from "../../firebase/useDb";
import { Invite } from "../../types/types";
import { Header } from "../../components/header/Header";
import styles from "../../styles/showApp.module.css";
import { Lists } from "../../components/lists/Lists";

const ShowInvite = () => {
  const router = useRouter();
  const { id } = router.query;

  const { user } = useAuth();

  const [invite, setInvite] = useState<Invite | null>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>();

  useEffect(() => {
    if (user) {
      const fetchInvite = async () => {
        setLoading(true);

        const inviteDoc = await getDoc(
          doc(invites, `${id}`).withConverter(inviteConverter)
        );
        inviteDoc.exists()
          ? setInvite(inviteDoc.data())
          : setError(new Error("Invite not found"));

        setLoading(false);
      };

      fetchInvite();
    }
  }, [id, user]);

  const handleJoinList = (response: boolean) => {
    if (invite) {
      updateDoc(invite.ref, { status: response ? "accepted" : "declined" });
      router.push(`/lists/${response ? invite?.data.listID : ""}`);
    }
  };

  if (loading) return <Loading />;
  if (error) return <ErrorComp msg={error.message} />;
  return (
    // TODO: add handling of already accepted/declined invites or expired
    // invites
    // TODO: handle 404 invite not found?
    <>
      {loading ? (
        <Loading />
      ) : (
        <>
          <div id={styles.container}>
            <Header />
            <div id={styles.main}>
              <Lists />
              <div
                style={{
                  position: "relative",
                  flex: "1",
                  paddingRight: "18px",
                  paddingLeft: "18px",
                }}
              >
                {invite?.data.status === "accepted" ? (
                  <p>Invite already {invite?.data.status}</p>
                ) : (
                  <>
                    <h2>Invite</h2>
                    <p>
                      You were invited by {invite?.data.inviterName} to join the
                      list &ldquo;{invite?.data.listName}&rdquo;.
                    </p>
                    <p>
                      <button onClick={() => handleJoinList(true)}>
                        accept
                      </button>{" "}
                      or
                      <button onClick={() => handleJoinList(false)}>
                        decline
                      </button>
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export const getServerSideProps = async () => {
  return {
    props: { protectedRoute: true },
  };
};

export default ShowInvite;
