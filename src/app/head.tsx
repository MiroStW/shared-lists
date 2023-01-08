const Head = ({ params }: { params: { slug: string } }) => {
  return (
    <>
      <title>Shared Lists</title>
      <meta property="og:title" content="Shared Lists" key="title" />
      <meta
        name="description"
        content="The easiest way to create checklists together."
      />
    </>
  );
};

export default Head;
