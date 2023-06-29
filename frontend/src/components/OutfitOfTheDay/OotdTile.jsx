import React, { useState, useEffect } from "react";
import styles from "./OutfitOfTheDay.module.css";
import Modal from "react-modal";
import getUserEmail from "../../helpers/getUserEmail";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const customStyles = {
  content: {
    border: "1px solid black",
    top: "50%",
    left: "50%",
    right: "auto",
    bottom: "auto",
    marginRight: "-50%",
    transform: "translate(-50%, -50%)",
    textAlign: "center",
    background:
      "linear-gradient(321deg, rgba(99,93,191,1) 3%, rgba(217,139,223,1) 61%)",
    color: "black",
    padding: "7px",
    borderRadius: "25px",
    border: "none",
  },
};

// Make sure to bind modal to your appElement (https://reactcommunity.org/react-modal/accessibility/)
// Modal.setAppElement('#modal');

const OotdTile = ({ imgLink, description, shoes, bottom, top }) => {
  const [modalIsOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState();

  // grab the current user's email and sync to state for post body
  useEffect(() => {
    const getEmail = async () => {
      const email = await getUserEmail();
      setEmail(email);
    };
    getEmail();
  });

  function openModal() {
    setIsOpen(true);
  }

  function afterOpenModal() {}

  function closeModal() {
    setIsOpen(false);
  }

  // allow the user to choose an outfit/outfits they like and save to static files
  function onClickHandler() {
    const outfitItems = shoes.concat(top, bottom);

    if (imgLink.substring(0, 16) !== "https://oaidalle") {
      toast.error("That's not an outfit, dude");
      closeModal();
      return;
    }

    const postBody = {
      imgUrl: imgLink,
      email: email,
    };

    // Get a list of clothing IDs from the outfit items
    const clothesIDs = outfitItems
      .map((item) => item.id)
      .filter((id) => !isNaN(id));

    // Call the changeClotheWornDate function to update the lastWorn field
    fetch("http://localhost:3006/api/changeClotheWornDate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ listOfIds: clothesIDs }),
    })
      .then((response) => {
        if (response.ok) {
          console.log("Last worn date updated successfully");
        } else {
          console.error("Error updating last worn date");
        }
      })
      .catch((error) => {
        console.error(error);
      });

    // Save the outfit to favorites
    try {
      axios.post("http://localhost:3006/ootd/saveFavourite", postBody);
      toast.success("Saved to favourites!");
    } catch (err) {
      console.log(err);
      toast.error("Something went wrong trying to save. Try again later");
    } finally {
      closeModal();
    }
  }

  //Opens a modal when the image is clicked on
  return (
    <div>
      <img
        src={imgLink}
        className={styles.OotdTile}
        onClick={() => openModal()}
        alt="outfit recommendation"
        width="20px"
      />
      <div className={styles.tileDesc}>{description}</div>

      <Modal
        isOpen={modalIsOpen}
        onAfterOpen={afterOpenModal}
        onRequestClose={closeModal}
        style={customStyles}
        contentLabel="OOTD"
      >
        <h2 style={{ fontSize: "22px", color: "#fefefe", paddingTop: "1.5vh", fontFamily: "Franklin Gothic Medium, Arial Narrow, Arial, sans-serif" }}>IS THIS YOUR NEW FAVOURITE OUTFIT?</h2>
        <div
          className={styles.imgDivContainer}
          style={{
            width: "auto",
            borderRadius: "2vh",
            padding: "1.5vh",
          }}
        >
          <img src={imgLink} alt="ootd" className={styles.imgDiv} />
        </div>

        <div className={styles.modalButton}>
          <button onClick={onClickHandler}>Yeah!</button>
          <button onClick={closeModal}>Not for me</button>
        </div>
      </Modal>
    </div>
  );
};

export default OotdTile;
