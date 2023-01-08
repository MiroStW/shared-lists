export const getServerSideProps = async () => {
  return {
    redirect: {
      permanent: false,
      destination: "/login",
    },
    props: {} as never,
  };
};

const Lists = () => {
  return null;
};

export default Lists;
