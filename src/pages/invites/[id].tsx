import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useRouter } from "next/router";
import { httpsCallable } from "firebase/functions";
import { useEffect, useState } from "react";
import { GetServerSidePropsContext } from "next";
import { Loading } from "../../components/utils/Loading";
import { Error as ErrorComp } from "../../components/utils/Error";
import { useAuth } from "../../firebase/authContext";
import { inviteConverter } from "../../firebase/firestoreConverter";
import { invites } from "../../firebase/useDb";
import { Invite } from "../../types/types";
import { Header } from "../../components/header/Header";
import styles from "../../styles/showApp.module.css";
import { Lists } from "../../components/lists/Lists";
import { functions } from "../../firebase/firebase";
import { verifyAuthToken } from "../../firebase/verifyAuthToken";

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const { user } = await verifyAuthToken(ctx);

  if (user)
    return {
      props: {
        serializedUser: JSON.stringify(user),
      },
    };
  else
    return {
      redirect: {
        permanent: false,
        destination: "/login",
      },
      props: {} as never,
    };
};

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

  const handleJoinList = async (response: boolean) => {
    if (invite && response) {
      updateDoc(invite.ref, { status: response ? "accepted" : "declined" });

      const addAuthorizedUser = httpsCallable(functions, "addAuthorizedUser");
      addAuthorizedUser({ listId: invite.data.listID, userId: user?.uid });

      // updateDoc(doc(lists, invite.data.listID), {
      //   contributors: arrayUnion(user?.uid),
      // });

      // // query all items of list to update authorizedUsers
      // const q = query(
      //   items,
      //   where("list", "==", invite.data.listID)
      // ).withConverter(itemConverter);
      // try {
      //   const itemsSnapshot = await getDocs(q);

      //   itemsSnapshot.forEach((snapshot) => {
      //     const item = snapshot.data();
      //     updateDoc(item.ref, {
      //       authorizedUsers: [...item.data.authorizedUsers, user?.uid],
      //     })
      //       .then(() => console.log("updated item: ", item.data.name))
      //       .catch((err) =>
      //         console.error("didnt update item: ", item.data.name, err)
      //       );
      //   });
      // } catch (err) {
      //   console.log("query went wrong: ", err);
      // }

      router.push(`/lists/${invite?.data.listID}`);
    } else router.push("/lists");
  };

  if (loading) return <Loading />;
  if (error) return <ErrorComp msg={error.message} />;
  return (
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

export default ShowInvite;
