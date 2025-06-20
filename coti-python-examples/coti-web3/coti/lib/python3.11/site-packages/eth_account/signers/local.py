from typing import (
    Any,
    Dict,
    Optional,
    Union,
    cast,
)

from eth_keyfile.keyfile import (
    KDFType,
)
from eth_keys.datatypes import (
    PrivateKey,
)
from eth_typing import (
    ChecksumAddress,
    Hash32,
)

from eth_account.account_local_actions import (
    AccountLocalActions,
)
from eth_account.datastructures import (
    SignedMessage,
    SignedTransaction,
)
from eth_account.messages import (
    SignableMessage,
)
from eth_account.signers.base import (
    BaseAccount,
)
from eth_account.types import (
    Blobs,
    TransactionDictType,
    UserOnboardInfo
)
from coti.crypto_utils import (
    build_input_text,
    build_string_input_text,
    decrypt_string,
    decrypt_uint
)
from coti.types import (
    CtBool,
    CtString,
    CtUint,
    ItBool,
    ItString,
    ItUint
)

class LocalAccount(BaseAccount):
    r"""
    A collection of convenience methods to sign and encrypt, with an
    embedded private key.

    :var bytes key: the 32-byte private key data

    .. code-block:: python

        >>> my_local_account.address
        "0xF0109fC8DF283027b6285cc889F5aA624EaC1F55"
        >>> my_local_account.key
        b"\x01\x23..."

    You can also get the private key by casting the account to :class:`bytes`:

    .. code-block:: python

        >>> bytes(my_local_account)
        b"\\x01\\x23..."
    """

    def __init__(self, key: PrivateKey, account: AccountLocalActions, user_onboard_info: UserOnboardInfo = None):
        """
        Initialize a new account with the given private key.

        :param eth_keys.PrivateKey key: to prefill in private key execution
        :param ~eth_account.account.Account account: the key-unaware management API
        :param ~eth_account.types UserOnboardInfo: A dictionary containing the information from the user's onboarding procedure
        """
        self._publicapi: AccountLocalActions = account

        self._address: ChecksumAddress = key.public_key.to_checksum_address()

        key_raw: bytes = key.to_bytes()
        self._private_key = key_raw

        self._key_obj: PrivateKey = key

        self._user_onboard_info = user_onboard_info

    @property
    def address(self) -> ChecksumAddress:
        return self._address

    @property
    def key(self) -> bytes:
        """
        Get the private key.
        """
        return self._private_key
    
    @property
    def user_onboard_info(self) -> UserOnboardInfo:
        return self._user_onboard_info
    
    @property
    def aes_key(self) -> Union[str, None]:
        if self._user_onboard_info is None:
            return None
        
        return self._user_onboard_info['aes_key']
    
    @property
    def rsa_key_pair(self) -> Union[tuple[str, str], None]:
        if self._user_onboard_info is None:
            return None
        
        return self._user_onboard_info['rsa_key_pair']
    
    @property
    def onboard_tx_hash(self) -> Union[str, None]:
        if self._user_onboard_info is None:
            return None
        
        return self._user_onboard_info['tx_hash']

    def encrypt(
        self,
        password: str,
        kdf: Optional[KDFType] = None,
        iterations: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Generate a string with the encrypted key.

        This uses the same structure as in
        :meth:`~eth_account.account.Account.encrypt`, but without a
        private key argument.
        """
        return self._publicapi.encrypt(
            self.key, password, kdf=kdf, iterations=iterations
        )

    def unsafe_sign_hash(self, message_hash: Hash32) -> SignedMessage:
        return cast(
            SignedMessage,
            self._publicapi.unsafe_sign_hash(
                message_hash,
                private_key=self.key,
            ),
        )

    def sign_message(self, signable_message: SignableMessage) -> SignedMessage:
        """
        Generate a string with the encrypted key.

        This uses the same structure as in
        :meth:`~eth_account.account.Account.sign_message`, but without a
        private key argument.
        """
        return cast(
            SignedMessage,
            self._publicapi.sign_message(signable_message, private_key=self.key),
        )

    def sign_transaction(
        self, transaction_dict: TransactionDictType, blobs: Optional[Blobs] = None
    ) -> SignedTransaction:
        return cast(
            SignedTransaction,
            self._publicapi.sign_transaction(transaction_dict, self.key, blobs=blobs),
        )

    def __bytes__(self) -> bytes:
        return self.key

    def set_user_onboard_info(self, user_onboard_info: UserOnboardInfo):
        self._user_onboard_info = user_onboard_info
    
    def set_aes_key(self, aes_key: str):
        self._user_onboard_info['aes_key'] = aes_key
    
    def set_rsa_key_pair(self, rsa_key_pair: tuple[str, str]):
        self._user_onboard_info['rsa_key_pair'] = rsa_key_pair
    
    def set_onboard_tx_hash(self, tx_hash: str):
        self._user_onboard_info['tx_hash'] = tx_hash
    
    def encrypt_value(self, plaintext_value: Union[bool, int, str], contract_address: str, function_selector: str) -> Union[ItBool, ItUint, ItString]:
        """
        Encrypt a value to be passed as an argument for a contract interaction.

        :param plaintext_value: value to encrypt
        :param contract_address: address of the contract
        :param function_selector: four-byte selector of the function being called
        """

        if self.aes_key is None:
            raise RuntimeError('user AES key is not defined')

        if type(plaintext_value) is bool or type(plaintext_value) is int:
            return build_input_text(plaintext_value, self.aes_key, self.address, contract_address, function_selector, self._private_key)
        else:
            return build_string_input_text(plaintext_value, self.aes_key, self.address, contract_address, function_selector, self._private_key)

    def decrypt_value(self, ciphertext: Union[CtBool, CtUint, CtString]) -> Union[bool, int, str]:
        """
        Decrypt a value encrypted with the user's AES key.

        :param ciphertext: value to decrypt
        """

        if self.aes_key is None:
            raise RuntimeError('user AES key is not defined')
        
        if type(ciphertext) is int:
            return decrypt_uint(ciphertext, self.aes_key)
        else:
            return decrypt_string(ciphertext, self.aes_key)